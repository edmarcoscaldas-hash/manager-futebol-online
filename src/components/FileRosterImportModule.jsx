import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import mammoth from 'mammoth/mammoth.browser';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const box = { background: '#0b1220', border: '1px solid #34465f', borderRadius: 12, padding: 16, color: '#f8fafc' };
const field = { width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 8, border: '1px solid #34465f', background: '#101b2b', color: '#fff' };
const primary = { background: '#176b4b', color: '#fff', border: 0, borderRadius: 8, padding: '11px 15px', cursor: 'pointer', fontWeight: 700 };

function clean(value) { return String(value ?? '').trim(); }
function key(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
const aliases = {
  player: ['jogador','atleta','player','player_name','nome','nome_jogador','nome_do_jogador','athlete'],
  team: ['clube','time','equipe','team','club','team_name','nome_clube','nome_do_clube'],
  country: ['pais','country','nacao'], competition: ['liga','campeonato','competicao','competition','divisao'],
  selection: ['selecao','selecao_nacional','national_team','national_selection','national_team_name'],
  position: ['posicao','position','role'], age: ['idade','age'], birth: ['data_nascimento','nascimento','birth_date','date_of_birth'],
  nationality: ['nacionalidade','nationality'], overall: ['overall','nota','nivel','rating','ovr'],
  value: ['valor_mercado','valor','market_value','value'], foot: ['pe_dominante','pe','foot','preferred_foot']
};
function findColumn(headers, names) { return headers.findIndex(header => names.includes(key(header))); }
function rowsFromText(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0], delimiter = first.includes(';') ? ';' : first.includes('\t') ? '\t' : first.includes('|') ? '|' : ',';
  return lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, '')));
}
function normalizeSheets(sheets) {
  const teams = new Map(), players = [];
  let skipped = 0;
  for (const sheet of sheets) {
    const rows = sheet.rows || [];
    if (!rows.length) continue;
    const headerIndex = rows.findIndex(row => row.some(cell => aliases.player.includes(key(cell)) || aliases.team.includes(key(cell)) || aliases.selection.includes(key(cell))));
    if (headerIndex < 0) { skipped += Math.max(0, rows.length - 1); continue; }
    const headers = rows[headerIndex].map(clean);
    const col = Object.fromEntries(Object.entries(aliases).map(([name, values]) => [name, findColumn(headers, values)]));
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i], value = name => col[name] >= 0 ? clean(row[col[name]]) : '';
      const playerName = value('player'), clubName = value('team'), selectionName = value('selection');
      const teamName = selectionName || clubName, country = value('country');
      const competition = value('competition') || (selectionName ? 'Seleções nacionais' : '');
      if (teamName) {
        const teamKey = key((selectionName ? 'selecao_' : 'clube_') + teamName + '_' + competition);
        if (!teams.has(teamKey)) teams.set(teamKey, {
          external_id: 'file_team_' + teamKey, country: country || null, competition: competition || null,
          team_name: teamName, payload: { team_type: selectionName ? 'selection' : 'club', source_sheet: sheet.name }
        });
      }
      if (!playerName) { if (!teamName) skipped++; continue; }
      if (!teamName) { skipped++; continue; }
      const teamKey = key((selectionName ? 'selecao_' : 'clube_') + teamName + '_' + competition);
      players.push({
        external_player_id: 'file_player_' + (players.length + 1) + '_' + key(playerName),
        external_team_id: 'file_team_' + teamKey, player_name: playerName,
        payload: {
          country: country || null, team_name: teamName, team_type: selectionName ? 'selection' : 'club',
          competition: competition || null, position: value('position') || null,
          age: value('age') ? Number(value('age')) : null, birth_date: value('birth') || null,
          nationality: value('nationality') || country || null,
          overall: value('overall') ? Number(value('overall')) : null,
          market_value: value('value') || null, preferred_foot: value('foot') || null,
          source_sheet: sheet.name, source_row: i + 1
        }
      });
    }
  }
  const seen = new Set();
  const uniquePlayers = players.filter(player => {
    const id = key(player.player_name) + '_' + player.external_team_id;
    if (seen.has(id)) return false;
    seen.add(id); return true;
  });
  return { teams: [...teams.values()], players: uniquePlayers, skipped, duplicates: players.length - uniquePlayers.length };
}
async function readFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (['xlsx','xls','csv'].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    return workbook.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false }) }));
  }
  if (extension === 'json') {
    const parsed = JSON.parse(await file.text());
    const toSheet = (name, data) => {
      if (!Array.isArray(data) || !data.length) return null;
      const headers = [...new Set(data.flatMap(item => Object.keys(item || {})))];
      return { name, rows: [headers, ...data.map(item => headers.map(header => item?.[header] ?? ''))] };
    };
    if (Array.isArray(parsed)) return [toSheet('JSON', parsed)].filter(Boolean);
    const sheets = [
      toSheet('Clubes', parsed.teams || parsed.clubes || parsed.clubs),
      toSheet('Jogadores', parsed.players || parsed.jogadores)
    ].filter(Boolean);
    if (!sheets.length) throw new Error('O JSON precisa conter uma lista de jogadores ou clubes.');
    return sheets;
  }
  if (extension === 'pdf') {
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise, lines = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo), content = await page.getTextContent();
      const grouped = new Map();
      for (const item of content.items) {
        const y = Math.round(item.transform?.[5] || 0);
        if (!grouped.has(y)) grouped.set(y, []);
        grouped.get(y).push({ x: item.transform?.[4] || 0, text: item.str || '' });
      }
      [...grouped.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
        lines.push(items.sort((a, b) => a.x - b.x).map(item => item.text).join('\t'));
      });
    }
    return [{ name: 'PDF', rows: rowsFromText(lines.join('\n')) }];
  }
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return [{ name: 'Word', rows: rowsFromText(result.value) }];
  }
  if (extension === 'txt') return [{ name: 'Texto', rows: rowsFromText(await file.text()) }];
  throw new Error('Formato não suportado. Envie XLSX, XLS, CSV, PDF, DOCX, TXT ou JSON.');
}

export default function FileRosterImportModule({ supabase }) {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [source, setSource] = useState('Arquivo enviado pelo administrador'), [runId, setRunId] = useState('');
  const total = useMemo(() => (preview?.teams?.length || 0) + (preview?.players?.length || 0), [preview]);

  function downloadTemplate() {
    const csv = '\uFEFFpaís;liga;clube;seleção;jogador;idade;nacionalidade;posição;overall;valor_mercado;pé_dominante\nBrasil;Série A;Palmeiras;;Nome do Jogador;25;Brasil;Atacante;78;12000000;Direito\nBrasil;; ;Brasil;Nome do Jogador da Seleção;27;Brasil;Meia;82;25000000;Esquerdo';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'modelo_importacao_mfo.csv'; link.click(); URL.revokeObjectURL(url);
  }
  async function analyze() {
    if (!file) return;
    setBusy(true); setError(''); setNotice(''); setPreview(null); setRunId('');
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 15 MB.');
      const result = normalizeSheets(await readFile(file));
      if (!result.teams.length && !result.players.length) throw new Error('Não encontrei clubes ou jogadores. Confira cabeçalhos como Clube, Jogador, Seleção, Posição e Idade.');
      setPreview(result); setNotice('Leitura concluída. Confira a prévia antes de enviar para a área privada de revisão.');
    } catch (e) { setError(e.message || 'Não foi possível ler o arquivo.'); }
    finally { setBusy(false); }
  }
  async function stage() {
    if (!preview) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('mfo-football-import', {
        body: { action: 'stage_file_import', source_name: source, file_name: file?.name || 'arquivo', teams: preview.teams, players: preview.players }
      });
      if (invokeError) {
        let message = invokeError.message || 'Falha ao enviar arquivo.';
        try { const body = await invokeError.context?.json(); message = body?.detail || body?.error || message; } catch {}
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.detail || data.error);
      setRunId(data.run_id);
      setNotice('Arquivo enviado para revisão privada: ' + data.teams_staged + ' clubes/seleções e ' + data.players_staged + ' jogadores. Nada foi publicado no jogo.');
    } catch (e) { setError(e.message || 'Não foi possível preparar a importação.'); }
    finally { setBusy(false); }
  }
  return <div style={{ display: 'grid', gap: 16, color: '#f8fafc' }}>
    <section style={{ ...box, borderColor: '#2d6849' }}>
      <span style={{ color: '#67e8a5', fontSize: 11, letterSpacing: 1.5, fontWeight: 800 }}>PAINEL MASTER • BASE DE DADOS</span>
      <h2 style={{ margin: '8px 0' }}>Central de Importação de Elencos</h2>
      <p style={{ color: '#a7b3c5', lineHeight: 1.6, marginBottom: 0 }}>Envie planilhas próprias, arquivos baixados da internet ou relatórios esportivos. A leitura acontece no navegador; os registros normalizados seguem para uma área privada de revisão, sem alterar o jogo.</p>
    </section>
    <section style={box}>
      <h3 style={{ marginTop: 0 }}>1. Enviar arquivo</h3>
      <p style={{ color: '#a7b3c5', fontSize: 13 }}>Formatos: XLSX, XLS, CSV, PDF com texto, DOCX, TXT e JSON. Tamanho máximo: 15 MB.</p>
      <input type="file" accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.json" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setRunId(''); setError(''); setNotice(''); }} style={{ ...field, padding: 9 }} />
      <button type="button" onClick={downloadTemplate} style={{ ...primary, marginTop: 10, background: '#26364d' }}>Baixar modelo de planilha CSV</button>
      <label style={{ display: 'block', color: '#a7b3c5', fontSize: 13, marginTop: 14 }}>Origem / observação
        <input value={source} onChange={e => setSource(e.target.value)} maxLength={120} style={{ ...field, marginTop: 6 }} />
      </label>
      <button onClick={analyze} disabled={!file || busy} style={{ ...primary, marginTop: 14 }}>{busy ? 'Lendo arquivo...' : 'Ler e analisar arquivo'}</button>
    </section>
    {preview && <section style={box}>
      <h3 style={{ marginTop: 0 }}>2. Conferir prévia</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
        <Metric label="CLUBES / SELEÇÕES" value={preview.teams.length} /><Metric label="JOGADORES" value={preview.players.length} />
        <Metric label="DUPLICADOS IGNORADOS" value={preview.duplicates} /><Metric label="LINHAS NÃO IDENTIFICADAS" value={preview.skipped} />
      </div>
      <div style={{ marginTop: 14 }}>
        <strong style={{ fontSize: 13 }}>Clubes e seleções identificados</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{preview.teams.slice(0, 20).map(team => <span key={team.external_id} style={{ border: '1px solid #34465f', borderRadius: 20, padding: '5px 9px', color: '#cbd5e1', fontSize: 12 }}>{team.team_name}{team.payload.team_type === 'selection' ? ' • Seleção' : ''}</span>)}</div>
        {preview.teams.length > 20 && <p style={{ color: '#8291a6', fontSize: 12 }}>Mais {preview.teams.length - 20} clubes/seleções identificados.</p>}
      </div>
      <div style={{ overflowX: 'auto', marginTop: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', color: '#a7b3c5' }}>{['Jogador','Clube / Seleção','Posição','Idade','Overall'].map(label => <th key={label} style={{ padding: 9, borderBottom: '1px solid #34465f' }}>{label}</th>)}</tr></thead>
          <tbody>{preview.players.slice(0, 12).map(player => <tr key={player.external_player_id}>
            <td style={{ padding: 9 }}>{player.player_name}</td><td style={{ padding: 9 }}>{player.payload.team_name}</td><td style={{ padding: 9 }}>{player.payload.position || '—'}</td><td style={{ padding: 9 }}>{player.payload.age || '—'}</td><td style={{ padding: 9 }}>{player.payload.overall ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {preview.players.length > 12 && <p style={{ color: '#8291a6', fontSize: 12 }}>Exibindo os primeiros 12 jogadores; os demais também serão enviados.</p>}
      <button onClick={stage} disabled={busy || !!runId || total === 0} style={{ ...primary, marginTop: 14 }}>{busy ? 'Enviando...' : 'Enviar para revisão privada'}</button>
    </section>}
    {notice && <p role="status" style={{ ...box, borderColor: '#2d8050', color: '#bbf7d0' }}>{notice}{runId && <><br/>ID da importação: <code>{runId}</code></>}</p>}
    {error && <p role="alert" style={{ ...box, borderColor: '#8d4141', color: '#fecaca' }}>Falha: {error}</p>}
    <section style={{ ...box, background: '#111827' }}>
      <strong>Regras de segurança e leitura</strong>
      <ul style={{ color: '#a7b3c5', fontSize: 13, lineHeight: 1.7, paddingLeft: 20 }}>
        <li>O arquivo é lido no navegador e não fica armazenado automaticamente em um drive público.</li>
        <li>PDF escaneado como imagem exige OCR e pode precisar ser convertido em planilha antes da leitura.</li>
        <li>Arquivos com colunas identificáveis funcionam melhor; jogadores precisam estar associados a um clube ou seleção.</li>
        <li>Os dados ficam em staging privado até uma etapa futura de revisão e aprovação.</li>
      </ul>
    </section>
  </div>;
}
function Metric({ label, value }) {
  return <div style={{ background: '#101b2b', border: '1px solid #34465f', borderRadius: 9, padding: 12 }}>
    <div style={{ color: '#8291a6', fontSize: 10, fontWeight: 700 }}>{label}</div>
    <div style={{ color: '#67e8a5', fontSize: 24, fontWeight: 700, marginTop: 5 }}>{value}</div>
  </div>;
}
