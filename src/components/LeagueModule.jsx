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
  const proximaRodadaPendente = rodadas.find(r => partidas.some(p => p.round_number === r && p.status === 'scheduled'));
  const partidaBaseRodada = partidas.find(p => p.round_number === proximaRodadaPendente && p.status === 'scheduled');
  const partidasFinalizadas = partidas.filter(p => p.status === 'finished').length;
  const proximasPartidas = partidas.filter(p => p.status === 'scheduled' && (p.home_club_id === clubeAtual?.id || p.away_club_id === clubeAtual?.id));
  const proximaPartida = [...proximasPartidas].sort((a,b) => new Date(a.match_date || 0) - new Date(b.match_date || 0))[0] || null;


  async function simularRodadaCompleta(partidaBase) {
    if (!partidaBase?.round_number || simulando) return;
    const rodada = partidaBase.round_number;
    const pendentes = partidas.filter(p => p.round_number === rodada && p.status === 'scheduled');
    if (!pendentes.length) {
      setMensagemJogo('Esta rodada não possui partidas pendentes.');
      return;
    }

    const jogoDoUsuario = pendentes.find(p =>
      p.home_club_id === clubeAtual?.id || p.away_club_id === clubeAtual?.id
    );
    const ordem = [
      ...(jogoDoUsuario ? [jogoDoUsuario] : []),
      ...pendentes.filter(p => p.id !== jogoDoUsuario?.id)
    ];

    setSimulando('rodada-' + rodada);
    setMensagemJogo('Simulando os jogos da rodada ' + rodada + '...');
    let concluidas = 0;
    let preservadas = 0;

    try {
      for (const jogo of ordem) {
        const { error } = await supabase.rpc('simulate_match', { p_match_id: jogo.id });
        if (error) {
          // Partidas sem autorização ou sem elenco válido permanecem intactas.
          preservadas += 1;
        } else {
          concluidas += 1;
        }
      }

      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('league_standings').select('*').eq('league_id', ligaId)
          .order('points', { ascending:false })
          .order('goal_difference', { ascending:false })
          .order('goals_for', { ascending:false }),
        supabase.from('matches').select('*').eq('league_id', ligaId)
          .order('round_number').order('match_date')
      ]);

      if (standingsRes.error) throw new Error('Jogos processados, mas a classificação não pôde ser atualizada: ' + standingsRes.error.message);
      if (matchesRes.error) throw new Error('Jogos processados, mas o calendário não pôde ser atualizado: ' + matchesRes.error.message);

      setClassificacao(standingsRes.data || []);
      setPartidas(matchesRes.data || []);
      setMensagemJogo(
        'Rodada ' + rodada + ' processada: ' + concluidas + ' partida(s) simulada(s).' +
        (preservadas ? ' ' + preservadas + ' partida(s) não processada(s), por proteção de acesso ou falta de escalação.' : '') +
        ' Classificação atualizada.'
      );
    } catch (error) {
      setMensagemJogo('A rodada foi parcialmente processada: ' + (error?.message || 'Erro inesperado.'));
    } finally {
      setSimulando('');
    }
  }

  async function simularPartida(partida) {
    if (!partida?.id || simulando) return;
    if (partida.status !== 'scheduled') {
      setMensagemJogo('Esta partida não está agendada ou já foi processada.');
      return;
    }
    if (partida.home_club_id !== clubeAtual?.id && partida.away_club_id !== clubeAtual?.id) {
      setMensagemJogo('Você só pode solicitar a simulação de partidas do clube que está treinando.');
      return;
    }

    setSimulando(partida.id);
    setMensagemJogo('');
    try {
      const { data, error } = await supabase.rpc('simulate_match', { p_match_id: partida.id });
      if (error) throw error;

      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('league_standings').select('*').eq('league_id', ligaId)
          .order('points', { ascending:false })
          .order('goal_difference', { ascending:false })
          .order('goals_for', { ascending:false }),
        supabase.from('matches').select('*').eq('league_id', ligaId)
          .order('round_number').order('match_date')
      ]);

      if (standingsRes.error) throw new Error('Partida processada, mas não foi possível atualizar a classificação: ' + standingsRes.error.message);
      if (matchesRes.error) throw new Error('Partida processada, mas não foi possível atualizar o calendário: ' + matchesRes.error.message);

      setClassificacao(standingsRes.data || []);
      setPartidas(matchesRes.data || []);

      const result = Array.isArray(data) ? data[0] : data;
      const homeScore = result?.home_score;
      const awayScore = result?.away_score;
      setMensagemJogo(
        homeScore !== undefined && awayScore !== undefined
          ? 'Partida simulada! Placar: ' + homeScore + ' × ' + awayScore
          : 'Partida processada. Calendário e classificação atualizados.'
      );
    } catch (error) {
      setMensagemJogo('Não foi possível concluir a simulação: ' + (error?.message || 'Erro inesperado.'));
    } finally {
      setSimulando('');
    }
  }

  return <div className="mfo-matches">
    <style>{`
      .mfo-matches{color:#edf7f0}
      .mfo-matches .mfo-match-hero{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:18px;padding:22px;background:radial-gradient(ellipse at 50% 0%,rgba(33,135,82,.23),transparent 65%),linear-gradient(125deg,#102c23,#0b1b20);border:1px solid #285540;border-radius:16px;margin:16px 0}
      .mfo-match-team{text-align:center;min-width:0}
      .mfo-match-team strong{display:block;font-size:clamp(14px,2vw,19px);overflow-wrap:anywhere}
      .mfo-match-crest{width:56px;height:56px;margin:0 auto 10px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#1c6845,#122b28);border:1px solid #4c9367;color:#dfffea;font-size:17px;font-weight:900}
      .mfo-match-vs{text-align:center;min-width:110px}
      .mfo-match-vs strong{display:block;font-size:26px;letter-spacing:1px;color:#e8f6ec}
      .mfo-match-vs span{font-size:10px;color:#83a995;letter-spacing:1.4px;font-weight:800}
      .mfo-match-date{font-size:12px;color:#91a99c;margin-top:6px}
      .mfo-match-status{display:inline-block;padding:5px 9px;border-radius:99px;background:#183e2c;color:#8df0ae;font-size:10px;font-weight:800;letter-spacing:.7px}
      .mfo-fixture-list{display:grid;gap:8px}
      .mfo-fixture-card{display:grid;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr);align-items:center;gap:12px;padding:13px 15px;background:linear-gradient(100deg,#10241f,#0d1b20);border:1px solid #244536;border-radius:11px}
      .mfo-fixture-club{font-size:13px;font-weight:750;overflow-wrap:anywhere}
      .mfo-fixture-score{text-align:center;background:#071412;border:1px solid #274839;border-radius:9px;padding:8px 5px;font-weight:900;white-space:nowrap}
      .mfo-fixture-meta{grid-column:1/-1;text-align:center;color:#81998d;font-size:11px}
      .mfo-fixture-actions{grid-column:1/-1;text-align:center}
      .mfo-matches button{cursor:pointer}
      @media(max-width:560px){
        .mfo-matches .mfo-match-hero{gap:8px;padding:15px 8px}
        .mfo-match-crest{width:42px;height:42px;font-size:14px}
        .mfo-match-vs{min-width:65px}
        .mfo-match-vs strong{font-size:20px}
        .mfo-fixture-card{grid-template-columns:minmax(0,1fr) 65px minmax(0,1fr);gap:6px;padding:11px 8px}
        .mfo-fixture-club{font-size:11px}
      }
    `}</style>
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
    {abaInterna==='jogos' && proximaPartida && <section className="mfo-match-hero">
      <div className="mfo-match-team">
        <div className="mfo-match-crest">{nomeClube(proximaPartida.home_club_id).slice(0,3).toUpperCase()}</div>
        <strong>{nomeClube(proximaPartida.home_club_id)}</strong>
        <div className="mfo-match-date">MANDANTE</div>
      </div>
      <div className="mfo-match-vs">
        <span>PRÓXIMO JOGO</span>
        <strong>VS</strong>
        <div className="mfo-match-date">{proximaPartida.match_date?new Date(proximaPartida.match_date).toLocaleString('pt-BR'):'Data a definir'}</div>
        <div style={{marginTop:10}}><button onClick={()=>simularPartida(proximaPartida)} disabled={Boolean(simulando)} style={{background:'linear-gradient(110deg,#15965b,#20c86b)',color:'#04170d',border:'1px solid #55e58a',borderRadius:8,padding:'9px 12px',fontWeight:900,fontSize:12}}>{simulando===proximaPartida.id?'Simulando...':'SIMULAR PARTIDA'}</button></div>
      </div>
      <div className="mfo-match-team">
        <div className="mfo-match-crest">{nomeClube(proximaPartida.away_club_id).slice(0,3).toUpperCase()}</div>
        <strong>{nomeClube(proximaPartida.away_club_id)}</strong>
        <div className="mfo-match-date">VISITANTE</div>
      </div>
    </section>}
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <h3 style={{marginTop:0}}>Calendário de partidas</h3>
        {partidaBaseRodada && <button
          onClick={()=>simularRodadaCompleta(partidaBaseRodada)}
          disabled={Boolean(simulando)}
          style={{background:'linear-gradient(110deg,#15965b,#20c86b)',color:'#04170d',border:'1px solid #55e58a',borderRadius:8,padding:'9px 12px',fontWeight:900,fontSize:11,opacity:simulando?0.6:1}}
        >{simulando==='rodada-'+proximaRodadaPendente?'SIMULANDO RODADA...':'⚽ SIMULAR RODADA '+proximaRodadaPendente}</button>}
      </div>
      {partidas.length===0 ? <p style={muted}>O calendário desta liga ainda não foi gerado. Nenhuma partida foi criada automaticamente para não alterar a composição atual dos campeonatos.</p> :
        rodadas.map(r=><div key={r} style={{marginTop:16}}>
          <h4 style={{color:'#67e8a5',borderBottom:'1px solid #34465f',paddingBottom:8}}>RODADA {r}</h4>
          <div className="mfo-fixture-list">{partidas.filter(p=>p.round_number===r).map(p=><article className="mfo-fixture-card" key={p.id}>
            <strong className="mfo-fixture-club" style={{textAlign:'right'}}>{nomeClube(p.home_club_id)}</strong>
            <div className="mfo-fixture-score">{p.status==='finished'?p.home_score+' × '+p.away_score:p.status==='live'?'AO VIVO':'VS'}</div>
            <strong className="mfo-fixture-club">{nomeClube(p.away_club_id)}</strong>
            <div className="mfo-fixture-meta">{p.match_date?new Date(p.match_date).toLocaleString('pt-BR'):'Data a definir'} • {p.status==='finished'?'FINALIZADO':p.status==='live'?'EM ANDAMENTO':p.status==='cancelled'?'CANCELADO':'AGENDADO'}</div>
            {p.status==='scheduled' && (p.home_club_id===clubeAtual?.id || p.away_club_id===clubeAtual?.id) && <div className="mfo-fixture-actions">
              <button onClick={()=>simularPartida(p)} disabled={Boolean(simulando)} style={{background:'linear-gradient(110deg,#15965b,#20c86b)',color:'#04170d',border:'1px solid #55e58a',borderRadius:8,padding:'8px 13px',fontWeight:900,fontSize:11}}>
                {simulando===p.id?'SIMULANDO...':'⚽ SIMULAR PARTIDA'}
              </button>
            </div>}
          </article>)}</div>
        </div>)}
    </section>}
    <p style={{...small,marginTop:14}}>A classificação é calculada diretamente a partir das partidas finalizadas. Os campeonatos existentes e seus clubes não são modificados por esta tela.</p>
  </div>;
}
