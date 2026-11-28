import { useEffect, useMemo, useState } from 'react';
import LiveMatch from './LiveMatch.jsx';

const card = { background:'#0a1a12', border:'1px solid #1f4a31', borderRadius:12, padding:16 };
const muted = { color:'#9fb6a7', margin:'6px 0' };
const small = { color:'#86a193', fontSize:12 };
const input = { width:'100%', boxSizing:'border-box', padding:12, borderRadius:9, border:'1px solid #1f4a31', background:'#0a1a12', color:'#fff', marginTop:6 };
const th = { textAlign:'left', padding:'11px 9px', borderBottom:'1px solid #1f4a31', color:'#67e8a5', fontSize:12, whiteSpace:'nowrap' };
const td = { padding:'11px 9px', borderBottom:'1px solid #1a3d29', fontSize:13, whiteSpace:'nowrap' };

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
  const [encerrando, setEncerrando] = useState(false);
  const [resumoTemporada, setResumoTemporada] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [aoVivo, setAoVivo] = useState(null);

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
        supabase.from('current_season_matches').select('*').eq('league_id', ligaId)
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


  async function abrirAoVivo(ids, rodada, fixos = [], interativo = null, minutoInicial = 0) {
    if (!ids.length && !interativo) return;
    let jogos = [];
    let eventos = [];
    if (ids.length) {
      const [jogosRes, eventosRes] = await Promise.all([
        supabase.from('current_season_matches').select('id,round_number,home_club_id,away_club_id,home_score,away_score,status').in('id', ids),
        supabase.from('match_events').select('match_id,club_id,player_id,related_player_id,minute,event_type')
          .in('match_id', ids).in('event_type', ['goal', 'penalty_goal', 'yellow_card', 'substitution']).order('minute')
      ]);
      if (jogosRes.error) return;
      jogos = (jogosRes.data || []).filter(j => j.status === 'finished');
      eventos = eventosRes.data || [];
    }
    if (interativo) {
      const e = interativo.estado;
      jogos = [...jogos, { id: e.match_id, round_number: rodada, home_club_id: e.home_club_id, away_club_id: e.away_club_id,
        home_score: e.home_score, away_score: e.away_score, status: 'live' }];
    }
    if (!jogos.length) return;
    const idsJogadores = [...new Set(eventos.flatMap(e => [e.player_id, e.related_player_id]).filter(Boolean))];
    let nomes = {};
    if (idsJogadores.length) {
      const { data } = await supabase.from('players').select('id,nome').in('id', idsJogadores);
      nomes = Object.fromEntries((data || []).map(j => [j.id, j.nome]));
    }
    setAoVivo({ jogos, eventos, nomes, rodada, fixos, interativo, minutoInicial });
  }

  // Executa o primeiro tempo e prepara os dados para o painel de intervalo.
  async function prepararInterativo(partida) {
    const { data: estado, error } = await supabase.rpc('mfo_match_first_half', { p_match_id: partida.id });
    if (error) throw error;
    const idsElenco = (estado?.squad || []).map(j => j.id);
    let contratos = {};
    if (idsElenco.length) {
      const { data, error: erroContratos } = await supabase.from('players').select('id,contrato_ate').in('id', idsElenco);
      if (erroContratos) throw erroContratos;
      contratos = Object.fromEntries((data || []).map(j => [j.id, j.contrato_ate]));
    }
    return {
      estado,
      contratos,
      onSegundoTempo: async mudancas => {
        const { data, error: erroSegundo } = await supabase.rpc('mfo_match_second_half', {
          p_match_id: partida.id,
          p_formation: mudancas.formation,
          p_style: mudancas.style,
          p_mentality: mudancas.mentality,
          p_substitutions: mudancas.subs
        });
        if (erroSegundo) throw new Error(erroSegundo.message);
        return data;
      }
    };
  }

  async function fecharAoVivo() {
    const atual = aoVivo;
    setAoVivo(null);
    if (atual?.interativo) {
      const principal = atual.jogos.find(j => j.id === atual.interativo.estado.match_id);
      if (principal) await registrarPressao(principal);
      setMensagemJogo('Partida encerrada. Classificação e energia dos jogadores atualizadas.');
    }
    await atualizarLiga();
  }

  async function registrarPressao(jogo) {
    if (!clubeAtual?.id || !jogo?.id) return;
    if (jogo.home_club_id !== clubeAtual.id && jogo.away_club_id !== clubeAtual.id) return;
    const { data, error } = await supabase.rpc('apply_match_pressure_event', { p_match_id: jogo.id, p_club_id: clubeAtual.id });
    window.dispatchEvent(new Event('mfo:atualizar-cabecalho'));
    if (!error && data?.job_status?.dismissed) {
      setMensagemJogo('A diretoria demitiu você: ' + (data.job_status.reason || 'resultados abaixo do esperado.') + ' Vamos escolher um novo clube...');
      setTimeout(() => window.location.reload(), 3500);
    }
  }

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
    const idsConcluidos = [];
    let interativo = null;
    let avisoPartida = '';

    try {
      for (const jogo of ordem) {
        if (jogo.id === jogoDoUsuario?.id) {
          try {
            interativo = await prepararInterativo(jogo);
          } catch (erroInicio) {
            preservadas += 1;
            avisoPartida = ' Sua partida não pôde começar: ' + (erroInicio?.message || 'erro inesperado.');
          }
          continue;
        }
        const { error } = await supabase.rpc('simulate_match', { p_match_id: jogo.id });
        if (error) {
          preservadas += 1;
        } else {
          concluidas += 1;
          idsConcluidos.push(jogo.id);
        }
      }

      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('league_standings').select('*').eq('league_id', ligaId)
          .order('points', { ascending:false })
          .order('goal_difference', { ascending:false })
          .order('goals_for', { ascending:false }),
        supabase.from('current_season_matches').select('*').eq('league_id', ligaId)
          .order('round_number').order('match_date')
      ]);

      if (standingsRes.error) throw new Error('Jogos processados, mas a classificação não pôde ser atualizada: ' + standingsRes.error.message);
      if (matchesRes.error) throw new Error('Jogos processados, mas o calendário não pôde ser atualizado: ' + matchesRes.error.message);

      setClassificacao(standingsRes.data || []);
      setPartidas(matchesRes.data || []);
      setMensagemJogo(
        'Rodada ' + rodada + ' processada: ' + concluidas + ' partida(s) simulada(s).' +
        (preservadas ? ' ' + preservadas + ' partida(s) não processada(s), por proteção de acesso ou falta de escalação.' : '') +
        ' Classificação atualizada.' + avisoPartida
      );
      await abrirAoVivo(idsConcluidos, rodada, [], interativo);
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
      const interativo = await prepararInterativo(partida);
      const [standingsRes, matchesRes] = await Promise.all([
        supabase.from('league_standings').select('*').eq('league_id', ligaId)
          .order('points', { ascending:false })
          .order('goal_difference', { ascending:false })
          .order('goals_for', { ascending:false }),
        supabase.from('current_season_matches').select('*').eq('league_id', ligaId)
          .order('round_number').order('match_date')
      ]);
      if (standingsRes.error) throw standingsRes.error;
      if (matchesRes.error) throw matchesRes.error;
      setClassificacao(standingsRes.data || []);
      setPartidas(matchesRes.data || []);
      const outrosFinalizados = (matchesRes.data || [])
        .filter(p => p.round_number === partida.round_number && p.status === 'finished')
        .map(p => p.id);
      await abrirAoVivo(outrosFinalizados, partida.round_number, [], interativo);
    } catch (error) {
      setMensagemJogo('Não foi possível iniciar a partida: ' + (error?.message || 'Erro inesperado.'));
    } finally {
      setSimulando('');
    }
  }

  const jogoAoVivoMeu = partidas.find(p => p.status === 'live' &&
    (p.home_club_id === clubeAtual?.id || p.away_club_id === clubeAtual?.id));

  async function retomarPartida() {
    if (!jogoAoVivoMeu || simulando) return;
    setSimulando(jogoAoVivoMeu.id);
    try {
      const interativo = await prepararInterativo(jogoAoVivoMeu);
      const outros = partidas.filter(p => p.round_number === jogoAoVivoMeu.round_number && p.status === 'finished').map(p => p.id);
      await abrirAoVivo(outros, jogoAoVivoMeu.round_number, [], interativo, 45);
    } catch (e) {
      setMensagemJogo('Não foi possível retomar a partida: ' + (e?.message || 'Erro inesperado.'));
    } finally {
      setSimulando('');
    }
  }

  const temporadaConcluida = partidas.length > 0 && partidas.every(p => p.status === 'finished' || p.status === 'cancelled');
  const ligaDoMeuClube = Boolean(clubeAtual?.league_id) && ligaId === clubeAtual.league_id;

  useEffect(() => {
    let ativo = true;
    async function carregarHistorico() {
      if (abaInterna !== 'historico' || !ligaSelecionada?.pais) return;
      const { data } = await supabase.from('league_season_results')
        .select('temporada,divisao,club_id,club_nome,posicao,pontos,campeao')
        .eq('pais', ligaSelecionada.pais).eq('campeao', true)
        .order('temporada', { ascending:false }).order('divisao');
      if (ativo) setHistorico(data || []);
    }
    carregarHistorico();
    return () => { ativo = false; };
  }, [supabase, abaInterna, ligaSelecionada?.pais, resumoTemporada]);

  async function encerrarTemporada() {
    if (!ligaSelecionada?.pais || encerrando) return;
    const ok = window.confirm('Encerrar a temporada ' + ligaSelecionada.temporada + ' do ' + ligaSelecionada.pais + '?\n\nAs divisões sem técnico serão simuladas, haverá acesso e rebaixamento, premiação, evolução dos jogadores e um novo calendário. Isso não pode ser desfeito.');
    if (!ok) return;
    setEncerrando(true);
    setMensagemJogo('');
    try {
      const { data, error } = await supabase.rpc('mfo_encerrar_temporada', { p_pais: ligaSelecionada.pais });
      if (error) throw error;
      let meuResultado = null;
      if (clubeAtual?.id) {
        const { data: r } = await supabase.from('league_season_results').select('*')
          .eq('club_id', clubeAtual.id).eq('temporada', data.temporada_encerrada).maybeSingle();
        meuResultado = r || null;
      }
      setResumoTemporada({ ...data, meuResultado });
    } catch (e) {
      setMensagemJogo('Não foi possível encerrar a temporada: ' + (e?.message || 'Erro inesperado.'));
    } finally {
      setEncerrando(false);
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
      <label style={{color:'#9fb6a7',fontSize:13}}>Campeonato
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
    {jogoAoVivoMeu && !aoVivo && <section style={{...card,marginTop:14,border:'1px solid #facc15',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><strong style={{color:'#facc15'}}>Partida em andamento</strong><p style={{...small,margin:'4px 0 0'}}>Seu jogo foi pausado. Retome para continuar do intervalo.</p></div>
      <button onClick={retomarPartida} disabled={Boolean(simulando)} style={{background:'#facc15',color:'#1a1503',border:0,borderRadius:9,padding:'11px 15px',fontWeight:900,cursor:'pointer'}}>{simulando ? 'CARREGANDO...' : 'RETOMAR PARTIDA'}</button>
    </section>}
    {aoVivo && <LiveMatch jogos={aoVivo.jogos} eventos={aoVivo.eventos} nomes={aoVivo.nomes} fixos={aoVivo.fixos}
      interativo={aoVivo.interativo} minutoInicial={aoVivo.minutoInicial} rodada={aoVivo.rodada}
      competicao={ligaSelecionada?.divisao} meuClubeId={clubeAtual?.id}
      nomeClube={nomeClube} onClose={fecharAoVivo} />}
    {resumoTemporada && <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:50,background:'rgba(2,10,6,.82)',display:'grid',placeItems:'center',padding:16,overflowY:'auto'}}>
      <div style={{...card,maxWidth:560,width:'100%',background:'#0d1f16',border:'1px solid #facc15'}}>
        <h2 style={{margin:'0 0 4px',color:'#facc15'}}>🏆 Temporada {resumoTemporada.temporada_encerrada} encerrada</h2>
        <p style={small}>{resumoTemporada.pais} • {resumoTemporada.partidas_simuladas} jogos de outras divisões simulados</p>
        {resumoTemporada.meuResultado && <div style={{background:'#112a1c',border:'1px solid #1f4a31',borderRadius:10,padding:12,margin:'12px 0'}}>
          <strong>{resumoTemporada.meuResultado.club_nome}: {resumoTemporada.meuResultado.posicao}º lugar</strong> na {resumoTemporada.meuResultado.divisao}
          <div style={small}>{resumoTemporada.meuResultado.pontos} pontos • {resumoTemporada.meuResultado.vitorias}V {resumoTemporada.meuResultado.empates}E {resumoTemporada.meuResultado.derrotas}D • premiação R$ {Number(resumoTemporada.meuResultado.premio||0).toLocaleString('pt-BR')}</div>
          {resumoTemporada.meuResultado.promovido && <div style={{color:'#67e8a5',fontWeight:800,marginTop:6}}>⬆ Seu clube foi promovido!</div>}
          {resumoTemporada.meuResultado.rebaixado && <div style={{color:'#fca5a5',fontWeight:800,marginTop:6}}>⬇ Seu clube foi rebaixado.</div>}
        </div>}
        <h4 style={{margin:'12px 0 6px',color:'#67e8a5'}}>Campeões</h4>
        {(resumoTemporada.campeoes||[]).map(c=><div key={c.divisao} style={{fontSize:13,padding:'3px 0'}}>{c.divisao}: <strong>{c.clube}</strong></div>)}
        {(resumoTemporada.promovidos||[]).length>0 && <><h4 style={{margin:'12px 0 6px',color:'#67e8a5'}}>Promovidos</h4><p style={{...small,margin:0}}>{resumoTemporada.promovidos.join(', ')}</p></>}
        {(resumoTemporada.rebaixados||[]).length>0 && <><h4 style={{margin:'12px 0 6px',color:'#fca5a5'}}>Rebaixados</h4><p style={{...small,margin:0}}>{resumoTemporada.rebaixados.join(', ')}</p></>}
        <button onClick={()=>window.location.reload()} style={{marginTop:16,width:'100%',background:'#facc15',color:'#1a1503',border:0,borderRadius:9,padding:'12px 14px',fontWeight:900,cursor:'pointer'}}>Começar a temporada {resumoTemporada.nova_temporada}</button>
      </div>
    </div>}
    {temporadaConcluida && ligaDoMeuClube && <section style={{...card,marginTop:14,border:'1px solid #facc15',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><strong style={{color:'#facc15'}}>🏁 Temporada {ligaSelecionada?.temporada} concluída</strong><p style={{...small,margin:'4px 0 0'}}>Todas as rodadas foram jogadas. Encerre para ver campeões, acesso e rebaixamento e começar a próxima temporada.</p></div>
      <button onClick={encerrarTemporada} disabled={encerrando} style={{background:'#facc15',color:'#1a1503',border:0,borderRadius:9,padding:'11px 15px',fontWeight:900,cursor:'pointer',opacity:encerrando?0.6:1}}>{encerrando?'ENCERRANDO...':'ENCERRAR TEMPORADA'}</button>
    </section>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0 12px'}}>
      <button style={{background:abaInterna==='classificacao'?'#168653':'#1a3d29',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'}} onClick={()=>setAbaInterna('classificacao')}>Classificação</button>
      <button style={{background:abaInterna==='jogos'?'#168653':'#1a3d29',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'}} onClick={()=>setAbaInterna('jogos')}>Calendário e jogos</button>
      <button style={{background:abaInterna==='historico'?'#168653':'#1a3d29',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'}} onClick={()=>setAbaInterna('historico')}>Histórico</button>
    </div>
    {mensagemJogo && <p style={{background:'#112a1c',color:'#e3f3e8',padding:12,borderRadius:9,marginTop:12}}>{mensagemJogo}</p>}
    {abaInterna==='historico' ? <section style={card}>
      <h3 style={{margin:'0 0 12px'}}>Campeões por temporada — {ligaSelecionada?.pais}</h3>
      {historico.length===0 ? <p style={muted}>Nenhuma temporada foi encerrada ainda. Quando você encerrar a primeira, os campeões aparecem aqui.</p> :
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
        <thead><tr>{['Temporada','Divisão','Campeão','Pontos'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{historico.map(h=><tr key={h.temporada+h.divisao} style={{background:h.club_id===clubeAtual?.id?'#153b31':'transparent'}}>
          <td style={td}>{h.temporada}</td><td style={td}>{h.divisao}</td><td style={{...td,fontWeight:800}}>🏆 {h.club_nome}{h.club_id===clubeAtual?.id?' ★':''}</td><td style={td}>{h.pontos}</td>
        </tr>)}</tbody>
      </table></div>}
    </section> : carregando ? <p style={muted}>Carregando dados do campeonato...</p> : abaInterna==='classificacao' ? <section style={card}>
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
          <h4 style={{color:'#67e8a5',borderBottom:'1px solid #1f4a31',paddingBottom:8}}>RODADA {r}</h4>
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
