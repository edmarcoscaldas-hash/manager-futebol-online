import { useEffect, useMemo, useState } from 'react';

const panel = { background:'linear-gradient(145deg,#14271f,#0d1b15)', border:'1px solid #294b39', borderRadius:15, padding:18, minWidth:0 };
const label = { color:'#79dba1', fontSize:11, letterSpacing:1.6, fontWeight:800 };
const muted = { color:'#9fb6a7', fontSize:13, lineHeight:1.6, margin:'7px 0' };
const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'}) : 'Data a definir';

export default function DashboardModule({ supabase, club, onNavigate }) {
  const [league,setLeague] = useState(null), [standings,setStandings] = useState([]), [matches,setMatches] = useState([]);
  const [clubs,setClubs] = useState([]), [roster,setRoster] = useState([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!club?.id || !supabase) { setLoading(false); return; }
      setLoading(true); setError('');
      const leaguePromise = club.league_id ? supabase.from('leagues').select('id,nome,pais,divisao,temporada').eq('id',club.league_id).maybeSingle() : Promise.resolve({data:null,error:null});
      const [leagueRes,rosterRes] = await Promise.all([leaguePromise,supabase.from('players').select('id,nome,posicao,overall,energia,is_youth').eq('club_id',club.id).eq('is_youth',false)]);
      if (!active) return;
      if (leagueRes.error) setError('Não foi possível consultar a divisão: '+leagueRes.error.message); else setLeague(leagueRes.data);
      if (rosterRes.error) setError('Não foi possível consultar a condição do elenco: '+rosterRes.error.message); else setRoster(rosterRes.data || []);
      if (club.league_id) {
        const [tableRes,matchRes,clubRes] = await Promise.all([
          supabase.from('league_standings').select('*').eq('league_id',club.league_id).order('points',{ascending:false}).order('goal_difference',{ascending:false}).order('goals_for',{ascending:false}),
          supabase.from('matches').select('*').eq('league_id',club.league_id).order('match_date',{ascending:true}),
          supabase.from('clubs').select('id,nome').eq('league_id',club.league_id)
        ]);
        if (!active) return;
        if (tableRes.error) setError('Não foi possível consultar a classificação: '+tableRes.error.message); else setStandings(tableRes.data || []);
        if (matchRes.error) setError('Não foi possível consultar as partidas: '+matchRes.error.message); else setMatches(matchRes.data || []);
        if (clubRes.error) setError('Não foi possível consultar os clubes da competição: '+clubRes.error.message); else setClubs(clubRes.data || []);
      } else { setStandings([]);setMatches([]);setClubs([]); }
      setLoading(false);
    }
    load(); return () => { active = false; };
  },[club?.id,club?.league_id,supabase]);
  const clubName = id => clubs.find(item => item.id === id)?.nome || 'Adversário não identificado';
  const tablePosition = standings.findIndex(row => row.club_id === club?.id);
  const nextMatch = useMemo(() => matches.find(match => match.status === 'scheduled' && (match.home_club_id === club?.id || match.away_club_id === club?.id)),[matches,club?.id]);
  const recentResults = useMemo(() => matches.filter(match => match.status === 'finished' && (match.home_club_id === club?.id || match.away_club_id === club?.id)).sort((a,b)=>new Date(b.match_date||0)-new Date(a.match_date||0)).slice(0,4),[matches,club?.id]);
  const avgEnergy = roster.length ? Math.round(roster.reduce((sum,player)=>sum+Number(player.energia ?? 100),0)/roster.length) : null;
  const energyTone = avgEnergy === null ? '#a8b8ad' : avgEnergy >= 75 ? '#43c77c' : avgEnergy >= 50 ? '#d9b65c' : '#e16b6b';
  const opponent = nextMatch ? clubName(nextMatch.home_club_id === club?.id ? nextMatch.away_club_id : nextMatch.home_club_id) : '';
  const finishedCount = matches.filter(match=>match.status==='finished'&&(match.home_club_id===club?.id||match.away_club_id===club?.id)).length;
  return <div className="mfo-dashboard-page">
    <div className="mfo-dashboard-heading"><div><span style={label}>CENTRAL DO TREINADOR</span><h2 style={{fontSize:'clamp(22px,3vw,30px)',margin:'7px 0'}}>{club?.nome || 'Meu clube'}</h2><p style={muted}>{league ? league.nome+' • '+league.divisao+' • Temporada '+league.temporada : 'Divisão não vinculada • Temporada não informada'}</p></div><div className="mfo-dashboard-actions"><button onClick={()=>onNavigate('Táticas')}>⚽ Escalação</button><button onClick={()=>onNavigate('Competições')}>🏆 Competições</button></div></div>
    {error && <p role="status" style={{background:'#382124',color:'#ffcaca',padding:12,borderRadius:10}}>{error}</p>}
    {loading ? <p style={muted}>Carregando dados reais do clube...</p> : <>
      <div className="mfo-dashboard-grid">
        <div style={panel}><span style={label}>PRÓXIMO JOGO</span>{nextMatch ? <><h3 style={{fontSize:20,margin:'12px 0 5px'}}>{nextMatch.home_club_id===club?.id?club?.nome:opponent} <span style={{color:'#7cdaa2'}}>×</span> {nextMatch.away_club_id===club?.id?club?.nome:opponent}</h3><p style={muted}>{dateTime(nextMatch.match_date)} • {nextMatch.round_number ? 'Rodada '+nextMatch.round_number : 'Partida agendada'}</p></> : <p style={muted}>Não há próxima partida agendada para este clube.</p>}<button className="mfo-dashboard-link" onClick={()=>onNavigate('Partidas')}>Ver calendário →</button></div>
        <div style={panel}><span style={label}>POSIÇÃO NA TABELA</span><strong style={{display:'block',fontSize:34,margin:'10px 0',color:tablePosition>=0?'#7cdaa2':'#e7f1e9'}}>{tablePosition>=0?(tablePosition+1)+'º':'—'}</strong><p style={muted}>{tablePosition>=0?standings[tablePosition].points+' pontos • '+(standings[tablePosition].played ?? 0)+' jogos':'Classificação ainda indisponível'}</p><button className="mfo-dashboard-link" onClick={()=>onNavigate('Competições')}>Ver classificação →</button></div>
        <div style={panel}><span style={label}>SALDO FINANCEIRO</span><strong style={{display:'block',fontSize:'clamp(22px,3vw,30px)',margin:'10px 0',color:Number(club?.orcamento||0)>=0?'#7cdaa2':'#e16b6b'}}>{money(club?.orcamento)}</strong><p style={muted}>Orçamento disponível registrado no clube</p><button className="mfo-dashboard-link" onClick={()=>onNavigate('Finanças')}>Abrir finanças →</button></div>
        <div style={panel}><span style={label}>CONDIÇÃO DO ELENCO</span><strong style={{display:'block',fontSize:34,margin:'10px 0',color:energyTone}}>{avgEnergy===null?'—':avgEnergy+'%'}</strong><p style={muted}>{avgEnergy===null?'Sem jogadores profissionais cadastrados':avgEnergy>=75?'Condição física média positiva':avgEnergy>=50?'Condição física média exige atenção':'Condição física média baixa'} • {roster.length} atletas</p><button className="mfo-dashboard-link" onClick={()=>onNavigate('Elenco')}>Ver elenco →</button></div>
      </div>
      <div className="mfo-dashboard-lower"><section style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><div><span style={label}>NOTÍCIAS DO CLUBE</span><h3 style={{margin:'7px 0'}}>Últimos resultados</h3></div><button className="mfo-dashboard-link" onClick={()=>onNavigate('Partidas')}>Todas as partidas →</button></div>{recentResults.length ? recentResults.map(match=><article key={match.id} className="mfo-news-item"><span className="mfo-news-date">{dateTime(match.match_date)}</span><strong>{clubName(match.home_club_id)} {match.home_score} × {match.away_score} {clubName(match.away_club_id)}</strong><span style={muted}>{match.round_number?'Rodada '+match.round_number:'Partida finalizada'}</span></article>) : <p style={muted}>Ainda não há resultados finalizados deste clube para exibir como notícia.</p>}</section>
      <aside style={panel}><span style={label}>RESUMO DA TEMPORADA</span><h3 style={{margin:'7px 0 14px'}}>Dados do clube</h3><div className="mfo-summary-row"><span>Elenco profissional</span><strong>{roster.length}</strong></div><div className="mfo-summary-row"><span>Jogos finalizados</span><strong>{finishedCount}</strong></div><div className="mfo-summary-row"><span>Estádio</span><strong>{Number(club?.capacidade||0).toLocaleString('pt-BR')}</strong></div><div className="mfo-summary-row"><span>Nível da estrutura</span><strong>{club?.stadium_level ? club.stadium_level+'/4' : '—'}</strong></div></aside></div>
    </>}
  </div>;
}