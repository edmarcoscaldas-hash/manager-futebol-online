import { useEffect, useMemo, useState } from 'react';

const card = { background:'#0b1220', border:'1px solid #34465f', borderRadius:12, padding:16 };
const muted = { color:'#a7b3c5', margin:'6px 0' };
const small = { color:'#8492a6', fontSize:12 };
const input = { width:'100%', boxSizing:'border-box', padding:12, borderRadius:9, border:'1px solid #34465f', background:'#0b1220', color:'#fff', marginTop:6 };
const th = { textAlign:'left', padding:'11px 9px', borderBottom:'1px solid #34465f', color:'#67e8a5', fontSize:12, whiteSpace:'nowrap' };
const td = { padding:'11px 9px', borderBottom:'1px solid #26364d', fontSize:13, whiteSpace:'nowrap' };

export default function LeagueModule({ supabase, clubeAtual, initialTab = 'classificacao' }) {
  const [ligas, setLigas] = useState([]);
  const [ligaId, setLigaId] = useState(clubeAtual?.league_id || '');
  const [classificacao, setClassificacao] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [abaInterna, setAbaInterna] = useState(initialTab);
  useEffect(() => { setAbaInterna(initialTab); }, [initialTab]);
  const [simulando, setSimulando] = useState('');
  const [mensagemJogo, setMensagemJogo] = useState('');

  useEffect(() => {
    let ativo = true;
    async function carregarLigas() {
      const { data, error } = await supabase.from('leagues')
        .select('id,nome,pais,divisao,temporada')
        .order('pais').order('divisao').order('nome');
      if (!ativo) return;
      if (error) setErro('Não foi possível carregar os campeonatos: ' + error.message);
      else {
        setLigas(data || []);
        if (clubeAtual?.league_id && data?.some(l => l.id === clubeAtual.league_id)) setLigaId(clubeAtual.league_id);
        else if (!ligaId && data?.length) setLigaId(data[0].id);
      }
    }
    carregarLigas();
    return () => { ativo = false; };
  }, [supabase, clubeAtual?.league_id]);

  useEffect(() => {
    let ativo = true;
    async function carregarDadosLiga() {
      if (!ligaId) {
        setClassificacao([]);
        setPartidas([]);
        setClubes([]);
        return;
      }
      setCarregando(true);
      setErro('');
      const [standingsRes, matchesRes, clubsRes] = await Promise.all([
        supabase.from('league_standings').select('*').eq('league_id', ligaId)
          .order('points', { ascending:false })
          .order('goal_difference', { ascending:false })
          .order('goals_for', { ascending:false }),
        supabase.from('matches').select('*').eq('league_id', ligaId)
          .order('round_number').order('match_date'),
        supabase.from('clubs').select('id,nome,league_id').eq('league_id', ligaId).order('nome')
      ]);
      if (!ativo) return;
      if (standingsRes.error) setErro('Erro na classificação: ' + standingsRes.error.message);
      else setClassificacao(standingsRes.data || []);
      if (matchesRes.error) setErro('Erro no calendário: ' + matchesRes.error.message);
      else setPartidas(matchesRes.data || []);
      if (clubsRes.error) setErro('Erro ao carregar clubes: ' + clubsRes.error.message);
      else setClubes(clubsRes.data || []);
      setCarregando(false);
    }
    carregarDadosLiga();
    return () => { ativo = false; };
  }, [supabase, ligaId]);

  const ligaSelecionada = ligas.find(l => l.id === ligaId);
  const nomeClube = id => clubes.find(c => c.id === id)?.nome || 'Clube';
  const rodadas = useMemo(() => [...new Set(partidas.map(p => p.round_number))].sort((a,b)=>a-b), [partidas]);
  const partidasFinalizadas = partidas.filter(p => p.status === 'finished').length;

  async function simularPartida(partida) {
    if (!partida?.id || simulando) return;
    setSimulando(partida.id);
    setMensagemJogo('');
    const { data, error } = await supabase.rpc('simulate_match', { p_match_id: partida.id });
    if (error) {
      setMensagemJogo('Não foi possível simular a partida: ' + error.message);
      setSimulando('');
      return;
    }
    const [standingsRes, matchesRes] = await Promise.all([
      supabase.from('league_standings').select('*').eq('league_id', ligaId)
        .order('points', { ascending:false })
        .order('goal_difference', { ascending:false })
        .order('goals_for', { ascending:false }),
      supabase.from('matches').select('*').eq('league_id', ligaId)
        .order('round_number').order('match_date')
    ]);
    if (standingsRes.error) setMensagemJogo('Partida finalizada, mas houve erro ao atualizar a classificação: ' + standingsRes.error.message);
    else setClassificacao(standingsRes.data || []);
    if (matchesRes.error) setMensagemJogo('Partida finalizada, mas houve erro ao atualizar o calendário: ' + matchesRes.error.message);
    else setPartidas(matchesRes.data || []);
    if (!standingsRes.error && !matchesRes.error) {
      setMensagemJogo('Partida simulada! Placar: ' + data.home_score + ' × ' + data.away_score);
    }
    setSimulando('');
  }

  return <div>
    <p style={muted}>Acompanhe os campeonatos cadastrados no MFO, a classificação calculada pelos resultados e a agenda de partidas.</p>
    {erro && <p style={{background:'#3a1e25',color:'#fecaca',padding:12,borderRadius:9}}>{erro}</p>}
    <div style={{...card, marginTop:16}}>
      <label style={{color:'#a7b3c5',fontSize:13}}>Campeonato
        <select style={input} value={ligaId} onChange={e=>setLigaId(e.target.value)}>
          {ligas.map(l=><option key={l.id} value={l.id}>{l.nome} • {l.pais} • {l.divisao} • {l.temporada}</option>)}
        </select>
      </label>
      {ligaSelecionada && <p style={small}>{ligaSelecionada.pais} • {ligaSelecionada.divisao} • Temporada {ligaSelecionada.temporada}</p>}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,marginTop:14}}>
      <div style={card}><span style={small}>CLUBES NA LIGA</span><h2 style={{margin:'8px 0',color:'#67e8a5'}}>{clubes.length}</h2></div>
      <div style={card}><span style={small}>PARTIDAS CADASTRADAS</span><h2 style={{margin:'8px 0'}}>{partidas.length}</h2></div>
      <div style={card}><span style={small}>JOGOS FINALIZADOS</span><h2 style={{margin:'8px 0'}}>{partidasFinalizadas}</h2></div>
      <div style={card}><span style={small}>RODADAS</span><h2 style={{margin:'8px 0'}}>{rodadas.length}</h2></div>
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0 12px'}}>
      <button style={{background:abaInterna==='classificacao'?'#176b4b':'#26364d',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'}} onClick={()=>setAbaInterna('classificacao')}>Classificação</button>
      <button style={{background:abaInterna==='jogos'?'#176b4b':'#26364d',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'}} onClick={()=>setAbaInterna('jogos')}>Calendário e jogos</button>
    </div>
    {mensagemJogo && <p style={{background:'#17263b',color:'#dbe7f5',padding:12,borderRadius:9,marginTop:12}}>{mensagemJogo}</p>}
    {carregando ? <p style={muted}>Carregando dados do campeonato...</p> : abaInterna==='classificacao' ? <section style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <h3 style={{margin:'0 0 12px'}}>Tabela de classificação</h3>
        <span style={small}>3 pontos por vitória • 1 por empate</span>
      </div>
      {classificacao.length===0 ? <p style={muted}>Ainda não há clubes vinculados a esta liga ou resultados registrados. A classificação será preenchida conforme os clubes e jogos forem cadastrados.</p> :
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
        <thead><tr>{['#','Clube','Pts','J','V','E','D','GP','GC','SG'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{classificacao.map((c,i)=><tr key={c.club_id} style={{background:c.club_id===clubeAtual?.id?'#153b31':'transparent'}}>
          <td style={td}>{i+1}º</td><td style={{...td,fontWeight:700}}>{c.club_name}{c.club_id===clubeAtual?.id?' ★':''}</td>
          <td style={{...td,color:'#67e8a5',fontWeight:800}}>{c.points}</td><td style={td}>{c.played}</td><td style={td}>{c.wins}</td><td style={td}>{c.draws}</td><td style={td}>{c.losses}</td><td style={td}>{c.goals_for}</td><td style={td}>{c.goals_against}</td><td style={td}>{c.goal_difference>0?'+':''}{c.goal_difference}</td>
        </tr>)}</tbody>
      </table></div>}
    </section> : <section style={card}>
      <h3 style={{marginTop:0}}>Calendário de partidas</h3>
      {partidas.length===0 ? <p style={muted}>O calendário desta liga ainda não foi gerado. Nenhuma partida foi criada automaticamente para não alterar a composição atual dos campeonatos.</p> :
        rodadas.map(r=><div key={r} style={{marginTop:16}}>
          <h4 style={{color:'#67e8a5',borderBottom:'1px solid #34465f',paddingBottom:8}}>RODADA {r}</h4>
          {partidas.filter(p=>p.round_number===r).map(p=><div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:10,padding:'12px 4px',borderBottom:'1px solid #26364d'}}>
            <strong style={{textAlign:'right',fontSize:13}}>{nomeClube(p.home_club_id)}</strong>
            <span style={{background:'#17263b',borderRadius:8,padding:'7px 10px',fontWeight:800,whiteSpace:'nowrap'}}>{p.status==='finished'?p.home_score+' × '+p.away_score:'VS'}</span>
            <strong style={{fontSize:13}}>{nomeClube(p.away_club_id)}</strong>
            <span style={{...small,gridColumn:'1 / -1',textAlign:'center'}}>{p.match_date?new Date(p.match_date).toLocaleString('pt-BR'):'Data a definir'} • {p.status==='finished'?'Finalizado':p.status==='live'?'Em andamento':p.status==='cancelled'?'Cancelado':'Agendado'}</span>
            {p.status==='scheduled' && (p.home_club_id===clubeAtual?.id || p.away_club_id===clubeAtual?.id) && <div style={{gridColumn:'1 / -1',textAlign:'center',marginTop:4}}>
              <button onClick={()=>simularPartida(p)} disabled={Boolean(simulando)} style={{background:'#176b4b',color:'#fff',border:0,borderRadius:8,padding:'8px 13px',cursor:'pointer',fontWeight:700}}>
                {simulando===p.id?'Simulando...':'⚽ Simular partida'}
              </button>
            </div>}
          </div>)}
        </div>)}
    </section>}
    <p style={{...small,marginTop:14}}>A classificação é calculada diretamente a partir das partidas finalizadas. Os campeonatos existentes e seus clubes não são modificados por esta tela.</p>
  </div>;
}
