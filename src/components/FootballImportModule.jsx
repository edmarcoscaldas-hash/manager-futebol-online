import { useMemo, useState } from 'react';

const countries = [{ label: 'Brasil', value: 'Brazil' }, { label: 'Inglaterra', value: 'England' }, { label: 'Espanha', value: 'Spain' }, { label: 'Alemanha', value: 'Germany' }, { label: 'Itália', value: 'Italy' }, { label: 'França', value: 'France' }, { label: 'Argentina', value: 'Argentina' }, { label: 'Estados Unidos', value: 'USA' }, { label: 'Arábia Saudita', value: 'Saudi Arabia' }];
const panel = { background: '#0b1918', border: '1px solid #29483e', borderRadius: 12, padding: 16 };
const primary = { background: 'linear-gradient(110deg,#15965b,#20c86b)', color: '#04170d', border: '1px solid #55e58a', borderRadius: 9, padding: '11px 15px', fontWeight: 800, cursor: 'pointer' };
const secondary = { background: '#132820', color: '#d9f5e4', border: '1px solid #315b43', borderRadius: 9, padding: '10px 13px', cursor: 'pointer' };
const field = { width: '100%', boxSizing: 'border-box', background: '#0b1920', color: '#eef8f1', border: '1px solid #29483e', borderRadius: 8, padding: 11, marginTop: 6 };

export default function FootballImportModule({ supabase }) {
  const [country, setCountry] = useState('Brazil');
  const [season, setSeason] = useState('2026');
  const [leagues, setLeagues] = useState([]);
  const [leagueId, setLeagueId] = useState('');
  const [teams, setTeams] = useState([]);
  const [runId, setRunId] = useState('');
  const [playersFound, setPlayersFound] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedLeague = useMemo(() => leagues.find(item => String(item.id) === String(leagueId)), [leagues, leagueId]);

  async function invoke(body) {
    const { data, error: invokeError } = await supabase.functions.invoke('mfo-football-import', { body });
    if (invokeError) {
      let detail = invokeError.message || 'Falha ao chamar a função.';
      try {
        const payload = await invokeError.context?.json();
        detail = payload?.detail || payload?.error || detail;
      } catch {}
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.detail || data.error);
    return data;
  }

  async function listLeagues() {
    setBusy(true); setError(''); setMessage('Consultando a API-Football...');
    setStatus('checking'); setTeams([]); setRunId(''); setPlayersFound(0);
    try {
      const data = await invoke({ action: 'list_leagues', country, season: Number(season) });
      setLeagues(data.leagues || []);
      setLeagueId(String(data.leagues?.[0]?.id || ''));
      setStatus('connected');
      setMessage(`Conexão validada: ${data.results ?? data.leagues?.length ?? 0} competição(ões) encontradas para ${country} na temporada ${season}.`);
    } catch (e) {
      setStatus('error'); setError(e.message); setMessage('');
    } finally { setBusy(false); }
  }

  async function stageLeague() {
    if (!leagueId) return;
    setBusy(true); setError(''); setMessage('Buscando clubes e criando uma prévia privada...');
    setTeams([]); setRunId(''); setPlayersFound(0);
    try {
      const data = await invoke({ action: 'stage_league', league_id: Number(leagueId), season: Number(season) });
      const stagedTeams = data.teams || [];
      const id = data.staging?.run_id || data.run_id;
      if (!id) throw new Error('A API retornou os clubes, mas não informou o identificador da importação.');
      setTeams(stagedTeams); setRunId(id); setStatus('staged');
      setMessage(`${stagedTeams.length} clube(s) preparados para conferência. Nenhum clube ativo foi alterado.`);
    } catch (e) { setStatus('error'); setError(e.message); setMessage(''); }
    finally { setBusy(false); }
  }

  async function stageSquads() {
    if (!runId || !teams.length) return;
    setBusy(true); setError(''); setPlayersFound(0);
    let total = 0;
    try {
      for (let index = 0; index < teams.length; index += 10) {
        const batch = teams.slice(index, index + 10);
        setMessage(`Importando elencos: ${Math.min(index + batch.length, teams.length)} de ${teams.length} clubes...`);
        const data = await invoke({ action: 'stage_squads', team_ids: batch.map(team => team.id), run_id: runId });
        total += Number(data.players_found || 0);
        setPlayersFound(total);
        if (data.team_errors?.length) {
          const failed = data.team_errors.map(item => `${item.team_id}: ${item.error}`).join(' | ');
          throw new Error(`Alguns elencos falharam: ${failed}`);
        }
      }
      setStatus('complete');
      setMessage(`Prévia concluída: ${teams.length} clubes e ${total} jogadores recebidos. Dados permanecem em staging privado, aguardando revisão.`);
    } catch (e) { setStatus('error'); setError(e.message); }
    finally { setBusy(false); }
  }

  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={{ ...panel, borderColor: '#2d6849' }}>
      <span style={{ color: '#71d99d', fontSize: 11, fontWeight: 800, letterSpacing: 1.4 }}>CENTRAL DE DADOS • API-FOOTBALL</span>
      <h3 style={{ margin: '8px 0' }}>Importação de clubes e elencos reais</h3>
      <p style={{ color: '#a9bdae', lineHeight: 1.6, marginBottom: 0 }}>Consulte as competições, selecione uma liga e importe os clubes e seus elencos para uma área privada de conferência. A chave da API permanece protegida no servidor.</p>
    </div>

    <div style={panel}>
      <h3 style={{ marginTop: 0 }}>1. Testar conexão e consultar competições</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <label style={{ color: '#b8cdbf', fontSize: 13 }}>País
          <select style={field} value={country} onChange={e => setCountry(e.target.value)} disabled={busy}>
            {countries.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label style={{ color: '#b8cdbf', fontSize: 13 }}>Temporada
          <input style={field} type="number" min="2020" max="2035" value={season} onChange={e => setSeason(e.target.value)} disabled={busy}/>
        </label>
      </div>
      <button style={{ ...primary, marginTop: 14 }} onClick={listLeagues} disabled={busy || !season}> {busy && status === 'checking' ? 'Testando...' : 'Testar conexão e buscar ligas'} </button>
      {status === 'connected' && <p style={{ color: '#70e0a0', marginBottom: 0 }}>● API respondeu com sucesso</p>}
    </div>

    {leagues.length > 0 && <div style={panel}>
      <h3 style={{ marginTop: 0 }}>2. Escolher competição</h3>
      <label style={{ color: '#b8cdbf', fontSize: 13 }}>Competições encontradas
        <select style={field} value={leagueId} onChange={e => setLeagueId(e.target.value)} disabled={busy}>
          {leagues.map(item => <option key={item.id} value={item.id}>{item.name} • {item.type || 'Liga'} • ID {item.id}</option>)}
        </select>
      </label>
      {selectedLeague?.seasons?.length > 0 && <p style={{ color: '#91aa9a', fontSize: 12 }}>Temporadas disponíveis: {selectedLeague.seasons.map(item => item.year).join(', ')}</p>}
      <button style={{ ...primary, marginTop: 8 }} onClick={stageLeague} disabled={busy || !leagueId}>Buscar clubes da competição</button>
    </div>}

    {teams.length > 0 && <div style={panel}>
      <h3 style={{ marginTop: 0 }}>3. Clubes recebidos ({teams.length})</h3>
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'grid', gap: 7 }}>
        {teams.map(team => <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #203b30', padding: '7px 0', color: '#d8e8dd', fontSize: 13 }}>
          <span>{team.name}</span><span style={{ color: '#789b86', whiteSpace: 'nowrap' }}>ID {team.id}</span>
        </div>)}
      </div>
      <button style={{ ...primary, marginTop: 14 }} onClick={stageSquads} disabled={busy || !runId}>
        {busy && status === 'staged' ? 'Importando elencos...' : 'Importar jogadores destes clubes'}
      </button>
      {playersFound > 0 && <p style={{ color: '#8ce5ac' }}>{playersFound} jogadores encontrados até agora.</p>}
    </div>}

    {message && <div style={{ ...panel, borderColor: status === 'complete' ? '#2d8050' : '#315b43', color: '#a9e9bf' }}>{message}</div>}
    {error && <div role="alert" style={{ ...panel, borderColor: '#8d4141', color: '#ffb4b4' }}>Falha: {error}</div>}
    <div style={{ ...panel, background: '#101c18' }}>
      <strong style={{ color: '#d8e8dd' }}>Proteção dos dados</strong>
      <p style={{ color: '#91aa9a', fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>A importação atual apenas cria registros de prévia nas tabelas privadas. Não substitui clubes, jogadores, carreiras, resultados, transferências ou finanças existentes. A publicação no jogo será uma etapa separada, após revisão.</p>
    </div>
  </div>;
}
