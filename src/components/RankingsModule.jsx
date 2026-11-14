import { useEffect, useMemo, useState } from 'react';

const panel = { background:'#0b1220', border:'1px solid #34465f', borderRadius:12, padding:16 };
const muted = { color:'#a7b3c5', margin:'6px 0' };
const small = { color:'#8492a6', fontSize:12 };
const th = { textAlign:'left', padding:'11px 9px', borderBottom:'1px solid #34465f', color:'#67e8a5', fontSize:12, whiteSpace:'nowrap' };
const td = { padding:'11px 9px', borderBottom:'1px solid #26364d', fontSize:13 };

export default function RankingsModule({ supabase, clubeAtual }) {
  const [leagues, setLeagues] = useState([]);
  const [leagueId, setLeagueId] = useState(clubeAtual?.league_id || '');
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('scorers');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      const [leagueRes, goalsRes] = await Promise.all([
        supabase.from('leagues').select('id,nome,pais,divisao,temporada').order('pais').order('divisao'),
        supabase.from('match_events').select('player_id,club_id,minute').eq('event_type','goal')
      ]);
      if (!active) return;
      if (leagueRes.error) setError('Não foi possível carregar os campeonatos: '+leagueRes.error.message);
      else {
        setLeagues(leagueRes.data || []);
        if (!leagueId && clubeAtual?.league_id) setLeagueId(clubeAtual.league_id);
        else if (!leagueId && leagueRes.data?.length) setLeagueId(leagueRes.data[0].id);
      }
      if (goalsRes.error) setError('Não foi possível carregar a artilharia: '+goalsRes.error.message);
      else {
        const goals = goalsRes.data || [];
        const playerIds = [...new Set(goals.map(g=>g.player_id).filter(Boolean))];
        const clubIds = [...new Set(goals.map(g=>g.club_id).filter(Boolean))];
        const [playersRes, clubsRes] = await Promise.all([
          playerIds.length ? supabase.from('players').select('id,nome').in('id',playerIds) : Promise.resolve({data:[],error:null}),
          clubIds.length ? supabase.from('clubs').select('id,nome').in('id',clubIds) : Promise.resolve({data:[],error:null})
        ]);
        if (!active) return;
        if (playersRes.error || clubsRes.error) setError('Os gols foram encontrados, mas não foi possível identificar todos os atletas ou clubes.');
        const players = new Map((playersRes.data || []).map(p=>[p.id,p.nome]));
        const clubs = new Map((clubsRes.data || []).map(c=>[c.id,c.nome]));
        const grouped = new Map();
        for (const goal of goals) {
          if (!goal.player_id) continue;
          const current = grouped.get(goal.player_id) || {player_id:goal.player_id,name:players.get(goal.player_id)||'Jogador',club:clubs.get(goal.club_id)||'Clube',goals:0};
          current.goals += 1;
          grouped.set(goal.player_id,current);
        }
        setScorers([...grouped.values()].sort((a,b)=>b.goals-a.goals || a.name.localeCompare(b.name,'pt-BR')));
      }
      setLoading(false);
    }
    load();
    return ()=>{active=false;};
  }, [supabase, clubeAtual?.league_id]);

  useEffect(() => {
    let active = true;
    async function loadStandings() {
      if (!leagueId) { setStandings([]); return; }
      const {data,error} = await supabase.from('league_standings').select('*').eq('league_id',leagueId)
        .order('points',{ascending:false}).order('goal_difference',{ascending:false}).order('goals_for',{ascending:false});
      if (!active) return;
      if (error) setError('Não foi possível carregar a classificação: '+error.message);
      else setStandings(data || []);
    }
    loadStandings();
    return ()=>{active=false;};
  }, [supabase,leagueId]);

  const league = useMemo(()=>leagues.find(l=>l.id===leagueId),[leagues,leagueId]);
  const selectedTab = (value)=>setTab(value);

  return <div style={{color:'#edf7f0'}}>
    <p style={muted}>Rankings calculados com os eventos e resultados efetivamente registrados no banco de dados. Nenhuma posição ou estatística fictícia é exibida.</p>
    {error && <p style={{background:'#3a1e25',color:'#fecaca',padding:12,borderRadius:9}}>{error}</p>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>
      <button onClick={()=>selectedTab('scorers')} style={{background:tab==='scorers'?'#176b4b':'#26364d',color:'#fff',border:0,borderRadius:8,padding:'10px 14px'}}>Artilharia</button>
      <button onClick={()=>selectedTab('league')} style={{background:tab==='league'?'#176b4b':'#26364d',color:'#fff',border:0,borderRadius:8,padding:'10px 14px'}}>Classificação por liga</button>
    </div>
    {loading ? <p style={muted}>Carregando rankings...</p> : tab==='scorers' ? <section style={panel}>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <h3 style={{margin:'0 0 10px'}}>Artilharia geral</h3><span style={small}>{scorers.length} jogadores com gols registrados</span>
      </div>
      {scorers.length===0 ? <p style={muted}>Ainda não há gols registrados nas partidas finalizadas.</p> :
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
          <thead><tr>{['#','Jogador','Clube','Gols'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
          <tbody>{scorers.map((p,i)=><tr key={p.player_id} style={{background:p.club===clubeAtual?.nome?'#153b31':'transparent'}}>
            <td style={td}>{i+1}º</td><td style={{...td,fontWeight:700}}>{p.name}</td><td style={td}>{p.club}</td><td style={{...td,color:'#67e8a5',fontWeight:900}}>{p.goals}</td>
          </tr>)}</tbody>
        </table></div>}
    </section> : <section style={panel}>
      <h3 style={{marginTop:0}}>Classificação oficial</h3>
      <label style={small}>Campeonato
        <select value={leagueId} onChange={e=>setLeagueId(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:11,borderRadius:8,border:'1px solid #34465f',background:'#0b1220',color:'#fff'}}>
          {leagues.map(l=><option key={l.id} value={l.id}>{l.nome} • {l.pais} • {l.divisao}</option>)}
        </select>
      </label>
      {league && <p style={small}>{league.pais} • {league.divisao} • Temporada {league.temporada}</p>}
      {standings.length===0 ? <p style={muted}>Ainda não há resultados registrados para este campeonato.</p> :
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
          <thead><tr>{['#','Clube','Pts','J','V','E','D','GP','GC','SG'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
          <tbody>{standings.map((c,i)=><tr key={c.club_id} style={{background:c.club_id===clubeAtual?.id?'#153b31':'transparent'}}>
            <td style={td}>{i+1}º</td><td style={{...td,fontWeight:700}}>{c.club_name}{c.club_id===clubeAtual?.id?' ★':''}</td>
            <td style={{...td,color:'#67e8a5',fontWeight:800}}>{c.points}</td><td style={td}>{c.played}</td><td style={td}>{c.wins}</td><td style={td}>{c.draws}</td><td style={td}>{c.losses}</td><td style={td}>{c.goals_for}</td><td style={td}>{c.goals_against}</td><td style={td}>{c.goal_difference>0?'+':''}{c.goal_difference}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>}
    <p style={{...small,marginTop:14}}>Ranking mundial de clubes, seleções e recordes históricos ainda dependem da integração de competições internacionais e temporadas encerradas.</p>
  </div>;
}
