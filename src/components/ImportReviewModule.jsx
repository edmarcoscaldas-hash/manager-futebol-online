import { useCallback, useEffect, useState } from 'react';

const panel = { background: '#0b1220', border: '1px solid #34465f', borderRadius: 12, padding: 16, color: '#f8fafc' };
const button = { background: '#176b4b', color: '#fff', border: 0, borderRadius: 7, padding: '8px 11px', cursor: 'pointer', fontWeight: 700 };
const muted = { color: '#a7b3c5', fontSize: 13 };

export default function ImportReviewModule({ supabase }) {
  const [runs, setRuns] = useState([]);
  const [runId, setRunId] = useState('');
  const [data, setData] = useState(null);
  const [teamOffset, setTeamOffset] = useState(0);
  const [playerOffset, setPlayerOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const invoke = useCallback(async (body) => {
    const { data: result, error: invokeError } = await supabase.functions.invoke('mfo-football-import', { body });
    if (invokeError) {
      let message = invokeError.message || 'Falha na consulta.';
      try { const detail = await invokeError.context?.json(); message = detail?.detail || detail?.error || message; } catch {}
      throw new Error(message);
    }
    if (result?.error) throw new Error(result.detail || result.error);
    return result;
  }, [supabase]);

  const loadRuns = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await invoke({ action: 'list_staging' });
      setRuns(result.runs || []);
      if (!runId && result.runs?.length) setRunId(result.runs[0].id);
    } catch (e) { setError(e.message || 'Não foi possível carregar as importações.'); }
    finally { setLoading(false); }
  }, [invoke, runId]);

  const loadRun = useCallback(async () => {
    if (!runId) { setData(null); return; }
    setLoading(true); setError('');
    try {
      const result = await invoke({ action: 'list_staging', run_id: runId, team_offset: teamOffset, player_offset: playerOffset, page_size: 50 });
      setData(result);
    } catch (e) { setError(e.message || 'Não foi possível carregar os registros.'); }
    finally { setLoading(false); }
  }, [invoke, runId, teamOffset, playerOffset]);

  useEffect(() => { loadRuns(); }, []);
  useEffect(() => { if (runId) loadRun(); }, [runId, teamOffset, playerOffset]);

  async function updateStatus(type, id, status) {
    const key = type + '-' + id;
    setWorking(key); setError(''); setNotice('');
    try {
      await invoke({ action: 'set_review_status', entity_type: type, record_id: id, review_status: status });
      setNotice(type === 'player' ? 'Status do jogador atualizado.' : 'Status do clube/seleção atualizado.');
      await loadRun();
    } catch (e) { setError(e.message || 'Não foi possível atualizar o status.'); }
    finally { setWorking(''); }
  }

  const statusLabel = (status) => ({ pending: 'Pendente', matched: 'Vinculado', new: 'Novo aprovado para próxima etapa', ignored: 'Ignorado', conflict: 'Conflito' }[status] || status);
  const fmt = (value) => value ? new Date(value).toLocaleString('pt-BR') : '—';

  return <div style={{ display: 'grid', gap: 14, color: '#f8fafc' }}>
    <section style={{ ...panel, borderColor: '#2d6849' }}>
      <span style={{ color: '#67e8a5', fontSize: 11, letterSpacing: 1.4, fontWeight: 800 }}>PAINEL MASTER • REVISÃO PRIVADA</span>
      <h2 style={{ margin: '8px 0' }}>Revisão de importações</h2>
      <p style={muted}>Aqui você classifica os registros importados. Marcar como “Novo” não publica no jogo: apenas separa os dados aceitos para uma futura etapa de integração.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={runId} onChange={e => { setRunId(e.target.value); setTeamOffset(0); setPlayerOffset(0); }} style={{ background: '#101b2b', color: '#fff', border: '1px solid #34465f', borderRadius: 8, padding: 10, minWidth: 240 }}>
          <option value="">Selecione uma importação</option>
          {runs.map(run => <option key={run.id} value={run.id}>{fmt(run.started_at)} · {run.provider} · {run.status}</option>)}
        </select>
        <button style={button} onClick={() => { loadRuns(); if (runId) loadRun(); }} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button>
      </div>
    </section>
    {error && <p role="alert" style={{ ...panel, borderColor: '#8d4141', color: '#fecaca' }}>{error}</p>}
    {notice && <p role="status" style={{ ...panel, borderColor: '#2d8050', color: '#bbf7d0' }}>{notice}</p>}
    {!runId && !loading && <section style={panel}><p style={muted}>Nenhuma importação encontrada. Primeiro envie os arquivos pela Central de Importação.</p></section>}
    {data && <>
      <section style={panel}>
        <strong>Resumo da importação</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 12 }}>
          <Metric label="CLUBES / SELEÇÕES" value={data.total_teams} />
          <Metric label="JOGADORES" value={data.total_players} />
          <Metric label="STATUS" value={data.run?.status || '—'} />
        </div>
        <p style={muted}>Origem: {data.run?.provider || '—'} · Criada em {fmt(data.run?.started_at)}</p>
      </section>
      <Records title="Clubes e seleções" records={data.teams || []} total={data.total_teams || 0} offset={teamOffset} onPage={setTeamOffset} type="team" onStatus={updateStatus} working={working} statusLabel={statusLabel} />
      <Records title="Jogadores" records={data.players || []} total={data.total_players || 0} offset={playerOffset} onPage={setPlayerOffset} type="player" onStatus={updateStatus} working={working} statusLabel={statusLabel} />
    </>}
    <section style={panel}><strong>Proteção dos dados</strong><p style={muted}>Esta tela altera somente o status de revisão nas tabelas privadas. Não cria clubes nem jogadores ativos, não modifica carreiras e não altera partidas.</p></section>
  </div>;
}

function Records({ title, records, total, offset, onPage, type, onStatus, working, statusLabel }) {
  return <section style={panel}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <strong>{title} · {total}</strong>
      <div style={{ display: 'flex', gap: 7 }}>
        <button style={button} disabled={offset <= 0} onClick={() => onPage(Math.max(0, offset - 50))}>Anterior</button>
        <button style={button} disabled={offset + records.length >= total} onClick={() => onPage(offset + 50)}>Próxima</button>
      </div>
    </div>
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 12 }}>
        <thead><tr style={{ textAlign: 'left', color: '#a7b3c5' }}>{(type === 'team' ? ['Clube / Seleção','País','Competição','Status'] : ['Jogador','Clube / Seleção','Posição','Idade','Overall','Status']).map(x => <th key={x} style={{ padding: 8, borderBottom: '1px solid #34465f' }}>{x}</th>)}<th style={{ padding: 8 }}>Ação</th></tr></thead>
        <tbody>{records.map(record => {
          const payload = record.payload || {};
          const label = type === 'team' ? record.team_name : record.player_name;
          return <tr key={record.id} style={{ borderTop: '1px solid #26364d' }}>
            <td style={{ padding: 8 }}>{label}</td>
            {type === 'team' ? <>
              <td style={{ padding: 8 }}>{record.country || '—'}</td><td style={{ padding: 8 }}>{record.competition || '—'}</td>
            </> : <>
              <td style={{ padding: 8 }}>{payload.team_name || '—'}</td><td style={{ padding: 8 }}>{payload.position || '—'}</td><td style={{ padding: 8 }}>{payload.age || '—'}</td><td style={{ padding: 8 }}>{payload.overall ?? '—'}</td>
            </>}
            <td style={{ padding: 8 }}>{statusLabel(record.review_status)}</td>
            <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
              <button style={{ ...button, marginRight: 5 }} disabled={!!working} onClick={() => onStatus(type, record.id, 'new')}>Novo</button>
              <button style={{ ...button, background: '#633b3b' }} disabled={!!working} onClick={() => onStatus(type, record.id, 'ignored')}>Ignorar</button>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p style={muted}>Exibindo {records.length ? offset + 1 : 0}–{offset + records.length} de {total}. A classificação é reversível enquanto estiver na área privada.</p>
  </section>;
}

function Metric({ label, value }) {
  return <div style={{ background: '#101b2b', border: '1px solid #34465f', borderRadius: 9, padding: 12 }}>
    <div style={{ color: '#8291a6', fontSize: 10, fontWeight: 700 }}>{label}</div>
    <div style={{ color: '#67e8a5', fontSize: 22, fontWeight: 700, marginTop: 5 }}>{value ?? 0}</div>
  </div>;
}
