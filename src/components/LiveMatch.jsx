import { useEffect, useMemo, useRef, useState } from 'react';
import HalftimePanel from './HalftimePanel.jsx';

function hashTexto(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function montarEventos(jogo, eventos, nomes, completar) {
  const lista = [];
  eventos.filter(e => e.match_id === jogo.id).forEach(e => {
    const lado = e.club_id === jogo.home_club_id ? 'casa' : 'fora';
    const minuto = Number(e.minute) || 1;
    if (e.event_type === 'goal' || e.event_type === 'penalty_goal') {
      lista.push({ tipo: 'gol', minuto, lado, autor: nomes[e.player_id] || 'Gol', assistencia: e.related_player_id ? nomes[e.related_player_id] : null });
    } else if (e.event_type === 'yellow_card') {
      lista.push({ tipo: 'cartao', minuto, lado, autor: nomes[e.player_id] || 'Jogador' });
    } else if (e.event_type === 'substitution') {
      lista.push({ tipo: 'troca', minuto, lado, saiu: nomes[e.player_id] || 'Jogador', entrou: nomes[e.related_player_id] || 'Jogador' });
    }
  });
  if (completar) {
    [['casa', Number(jogo.home_score) || 0], ['fora', Number(jogo.away_score) || 0]].forEach(([lado, alvo]) => {
      const existentes = lista.filter(g => g.tipo === 'gol' && g.lado === lado).length;
      for (let i = existentes; i < alvo; i += 1) {
        lista.push({ tipo: 'gol', minuto: 3 + (hashTexto(jogo.id + lado + i) % 86), lado, autor: 'Gol', assistencia: null });
      }
    });
  }
  return lista.sort((a, b) => a.minuto - b.minuto);
}

export default function LiveMatch({ jogos, eventos, nomes, nomeClube, meuClubeId, rodada, competicao, fixos = [], interativo = null, minutoInicial = 0, onClose }) {
  const [minuto, setMinuto] = useState(minutoInicial);
  const [velocidade, setVelocidade] = useState(1);
  const [pausado, setPausado] = useState(false);
  const [intervalo, setIntervalo] = useState(false);
  const [fase, setFase] = useState(interativo && minutoInicial >= 45 ? 'decisao' : 'rodando');
  const [estadoFinal, setEstadoFinal] = useState(null);
  const [erro, setErro] = useState('');
  const passouIntervalo = useRef(minutoInicial >= 45);

  const principalId = interativo?.estado?.match_id || null;
  const estadoAtual = estadoFinal || interativo?.estado || null;
  const nomesTodos = useMemo(() => ({ ...nomes, ...(estadoAtual?.names || {}) }), [nomes, estadoAtual]);

  const partidas = useMemo(() => jogos.map(j => {
    const ehPrincipal = principalId && j.id === principalId;
    if (ehPrincipal && estadoAtual) {
      const eventosPrincipal = (estadoAtual.events || []).map(e => ({ ...e, match_id: j.id }));
      const jogoAtual = { ...j, home_score: estadoAtual.home_score, away_score: estadoAtual.away_score };
      return { ...jogoAtual, fixo: false, principal: true, eventos: montarEventos(jogoAtual, eventosPrincipal, nomesTodos, false) };
    }
    return { ...j, fixo: fixos.includes(j.id), principal: false, eventos: montarEventos(j, eventos, nomesTodos, true) };
  }), [jogos, eventos, nomesTodos, fixos, principalId, estadoAtual]);

  const principal = partidas.find(p => p.principal)
    || partidas.find(p => !p.fixo && (p.home_club_id === meuClubeId || p.away_club_id === meuClubeId))
    || partidas.find(p => !p.fixo) || partidas[0];

  const fim = minuto >= 90 && (!interativo || Boolean(estadoFinal));

  useEffect(() => {
    if (fase !== 'rodando' || pausado || fim) return undefined;
    const espera = (intervalo ? 2200 : 260) / velocidade;
    const t = setTimeout(() => {
      if (intervalo) { setIntervalo(false); setMinuto(m => m + 1); return; }
      if (minuto === 45 && !passouIntervalo.current) {
        passouIntervalo.current = true;
        if (interativo && !estadoFinal) { setFase('decisao'); return; }
        setIntervalo(true);
        return;
      }
      setMinuto(m => Math.min(90, m + 1));
    }, espera);
    return () => clearTimeout(t);
  }, [minuto, pausado, fim, velocidade, intervalo, fase, interativo, estadoFinal]);

  const pular = () => {
    setIntervalo(false);
    if (interativo && !estadoFinal && minuto < 45) {
      passouIntervalo.current = true;
      setMinuto(45);
      setFase('decisao');
      return;
    }
    setMinuto(90);
  };

  useEffect(() => {
    const aoTeclar = e => {
      if (e.key !== 'Escape') return;
      if (fim) onClose();
      else if (fase === 'rodando') pular();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  async function confirmarSegundoTempo(mudancas) {
    setFase('carregando');
    setErro('');
    try {
      const final = await interativo.onSegundoTempo(mudancas);
      setEstadoFinal(final);
      setMinuto(46);
      setFase('rodando');
    } catch (e) {
      setErro(e?.message || 'Não foi possível iniciar o 2º tempo.');
      setFase('decisao');
    }
  }

  if (!principal) return null;
  const placar = p => {
    if (p.principal) {
      if (fim) return [Number(p.home_score) || 0, Number(p.away_score) || 0];
      const gols = p.eventos.filter(e => e.tipo === 'gol' && e.minuto <= minuto);
      return [gols.filter(g => g.lado === 'casa').length, gols.filter(g => g.lado === 'fora').length];
    }
    if (p.fixo || minuto >= 90) return [Number(p.home_score) || 0, Number(p.away_score) || 0];
    const gols = p.eventos.filter(e => e.tipo === 'gol' && e.minuto <= minuto);
    return [gols.filter(g => g.lado === 'casa').length, gols.filter(g => g.lado === 'fora').length];
  };

  const [golsCasa, golsFora] = placar(principal);
  const visiveis = principal.eventos.filter(e => fim || e.minuto <= minuto);
  const emDecisao = fase === 'decisao' || fase === 'carregando';
  const rotuloFase = fim ? 'FIM DE JOGO' : emDecisao ? 'INTERVALO' : intervalo ? 'INTERVALO' : minuto <= 45 ? '1º TEMPO' : '2º TEMPO';
  const euCasa = principal.home_club_id === meuClubeId;
  const euFora = principal.away_club_id === meuClubeId;
  const meuPlacar = euCasa ? golsCasa : golsFora;
  const advPlacar = euCasa ? golsFora : golsCasa;
  const resultado = !(euCasa || euFora) ? null : meuPlacar > advPlacar ? 'VITÓRIA' : meuPlacar < advPlacar ? 'DERROTA' : 'EMPATE';
  const relogio = fim ? 'FIM' : (emDecisao || intervalo) ? 'INT' : minuto + "'";
  const textoEvento = e => e.tipo === 'gol' ? '⚽ ' + e.minuto + "' " + e.autor
    : e.tipo === 'cartao' ? '🟨 ' + e.minuto + "' " + e.autor
    : '🔁 ' + e.minuto + "' Entra " + e.entrou + ' • sai ' + e.saiu;

  return <div className="mfo-live" role="dialog" aria-modal="true" aria-label="Partida ao vivo">
    <div className="mfo-live-box">
      <div className="mfo-live-top">
        <span>{competicao ? competicao + ' • ' : ''}Rodada {rodada}</span>
        <span className={'mfo-live-clock ' + ((emDecisao || intervalo) ? 'is-break' : fim ? 'is-end' : '')}>{relogio}</span>
      </div>
      <div className="mfo-live-phase">{rotuloFase}</div>
      <div className="mfo-live-score">
        <strong className={euCasa ? 'is-me' : ''}>{nomeClube(principal.home_club_id)}</strong>
        <div className="mfo-live-num"><b>{golsCasa}</b><i>x</i><b>{golsFora}</b></div>
        <strong className={euFora ? 'is-me' : ''}>{nomeClube(principal.away_club_id)}</strong>
      </div>
      <div className="mfo-live-goals" aria-live="polite">
        {visiveis.length === 0 ? <p className="mfo-live-muted">Sem lances até agora.</p> : visiveis.map((e, i) =>
          <div key={i} className={'mfo-live-goal is-' + e.tipo + ' ' + (e.lado === 'casa' ? 'is-home' : 'is-away') + (e.tipo === 'gol' && !fim && minuto - e.minuto < 2 ? ' is-new' : '')}>
            <span>{textoEvento(e)}</span>
            {e.tipo === 'gol' && e.assistencia && <small>assist. {e.assistencia}</small>}
          </div>)}
      </div>
      {fim && resultado && <div className={'mfo-live-result ' + resultado.toLowerCase()}>{resultado}</div>}
      {emDecisao && interativo && <HalftimePanel estado={estadoAtual} contratos={interativo.contratos}
        carregando={fase === 'carregando'} erro={erro} onConfirmar={confirmarSegundoTempo} />}
      {!emDecisao && <div className="mfo-live-round">
        <h4>Jogos da rodada</h4>
        {partidas.map(p => {
          const [c, f] = placar(p);
          const recente = !p.fixo && !fim && p.eventos.some(e => e.tipo === 'gol' && e.minuto <= minuto && minuto - e.minuto < 3);
          return <div key={p.id} className={'mfo-live-row' + (p.id === principal.id ? ' is-main' : '') + (recente ? ' is-goal' : '')}>
            <span className="h">{nomeClube(p.home_club_id)}</span><b>{c} x {f}</b><span className="a">{nomeClube(p.away_club_id)}</span>
          </div>;
        })}
      </div>}
      {!emDecisao && <div className="mfo-live-controls">
        {!fim ? <>
          <button type="button" onClick={() => setPausado(v => !v)}>{pausado ? '▶ Continuar' : '⏸ Pausar'}</button>
          {[1, 2, 4].map(v => <button key={v} type="button" className={velocidade === v ? 'is-on' : ''} onClick={() => setVelocidade(v)}>{v}x</button>)}
          <button type="button" onClick={pular}>{interativo && !estadoFinal && minuto < 45 ? 'Ir ao intervalo »' : 'Pular »'}</button>
        </> : <button type="button" className="is-primary" onClick={onClose}>Continuar</button>}
      </div>}
    </div>
  </div>;
}
