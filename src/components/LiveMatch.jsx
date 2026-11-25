import { useEffect, useMemo, useState } from 'react';

function hashTexto(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Gols do jogo (do banco). Se faltar algum para bater com o placar final, completa com minutos determinísticos.
function montarGols(jogo, eventos, nomes) {
  const doJogo = eventos.filter(e => e.match_id === jogo.id && e.event_type === 'goal').map(e => ({
    minuto: Number(e.minute) || 1,
    lado: e.club_id === jogo.home_club_id ? 'casa' : 'fora',
    autor: nomes[e.player_id] || 'Gol',
    assistencia: e.related_player_id ? nomes[e.related_player_id] : null
  }));
  const gols = [];
  [['casa', Number(jogo.home_score) || 0], ['fora', Number(jogo.away_score) || 0]].forEach(([lado, alvo]) => {
    const existentes = doJogo.filter(g => g.lado === lado).slice(0, alvo);
    gols.push(...existentes);
    for (let i = existentes.length; i < alvo; i += 1) {
      gols.push({ minuto: 3 + (hashTexto(jogo.id + lado + i) % 86), lado, autor: 'Gol', assistencia: null });
    }
  });
  return gols.sort((a, b) => a.minuto - b.minuto);
}

export default function LiveMatch({ jogos, eventos, nomes, nomeClube, meuClubeId, rodada, competicao, fixos = [], onClose }) {
  const [minuto, setMinuto] = useState(0);
  const [velocidade, setVelocidade] = useState(1);
  const [pausado, setPausado] = useState(false);
  const [intervalo, setIntervalo] = useState(false);

  const partidas = useMemo(() => jogos.map(j => ({ ...j, fixo: fixos.includes(j.id), gols: montarGols(j, eventos, nomes) })),
    [jogos, eventos, nomes, fixos]);
  const principal = partidas.find(p => !p.fixo && (p.home_club_id === meuClubeId || p.away_club_id === meuClubeId))
    || partidas.find(p => !p.fixo) || partidas[0];
  const fim = minuto >= 90;

  useEffect(() => {
    if (pausado || fim) return undefined;
    const espera = (intervalo ? 2200 : 260) / velocidade;
    const t = setTimeout(() => {
      if (intervalo) { setIntervalo(false); setMinuto(m => m + 1); return; }
      if (minuto === 45) { setIntervalo(true); return; }
      setMinuto(m => Math.min(90, m + 1));
    }, espera);
    return () => clearTimeout(t);
  }, [minuto, pausado, fim, velocidade, intervalo]);

  const pular = () => { setIntervalo(false); setMinuto(90); };

  useEffect(() => {
    const aoTeclar = e => { if (e.key === 'Escape') { if (minuto >= 90) onClose(); else pular(); } };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [minuto, onClose]);

  if (!principal) return null;

  const placar = p => {
    if (p.fixo || fim) return [Number(p.home_score) || 0, Number(p.away_score) || 0];
    return [p.gols.filter(g => g.lado === 'casa' && g.minuto <= minuto).length, p.gols.filter(g => g.lado === 'fora' && g.minuto <= minuto).length];
  };
  const [golsCasa, golsFora] = placar(principal);
  const golsVisiveis = principal.gols.filter(g => fim || g.minuto <= minuto);
  const fase = fim ? 'FIM DE JOGO' : intervalo ? 'INTERVALO' : minuto <= 45 ? '1º TEMPO' : '2º TEMPO';
  const euCasa = principal.home_club_id === meuClubeId;
  const euFora = principal.away_club_id === meuClubeId;
  const meuPlacar = euCasa ? golsCasa : golsFora;
  const adversarioPlacar = euCasa ? golsFora : golsCasa;
  const resultado = !(euCasa || euFora) ? null : meuPlacar > adversarioPlacar ? 'VITÓRIA' : meuPlacar < adversarioPlacar ? 'DERROTA' : 'EMPATE';

  return <div className="mfo-live" role="dialog" aria-modal="true" aria-label="Partida ao vivo">
    <div className="mfo-live-box">
      <div className="mfo-live-top">
        <span>{competicao ? competicao + ' • ' : ''}Rodada {rodada}</span>
        <span className={'mfo-live-clock ' + (intervalo ? 'is-break' : fim ? 'is-end' : '')}>{fim ? 'FIM' : intervalo ? 'INT' : minuto + "'"}</span>
      </div>
      <div className="mfo-live-phase">{fase}</div>

      <div className="mfo-live-score">
        <strong className={euCasa ? 'is-me' : ''}>{nomeClube(principal.home_club_id)}</strong>
        <div className="mfo-live-num"><b>{golsCasa}</b><i>x</i><b>{golsFora}</b></div>
        <strong className={euFora ? 'is-me' : ''}>{nomeClube(principal.away_club_id)}</strong>
      </div>

      <div className="mfo-live-goals" aria-live="polite">
        {golsVisiveis.length === 0 ? <p className="mfo-live-muted">Sem gols até agora.</p> : golsVisiveis.map((g, i) =>
          <div key={i} className={'mfo-live-goal ' + (g.lado === 'casa' ? 'is-home' : 'is-away') + (!fim && minuto - g.minuto < 2 ? ' is-new' : '')}>
            <span>⚽ {g.minuto}' {g.autor}</span>
            {g.assistencia && <small>assist. {g.assistencia}</small>}
          </div>)}
      </div>

      {fim && resultado && <div className={'mfo-live-result ' + resultado.toLowerCase()}>{resultado}</div>}

      <div className="mfo-live-round">
        <h4>Jogos da rodada</h4>
        {partidas.map(p => {
          const [c, f] = placar(p);
          const recente = !p.fixo && !fim && p.gols.some(g => g.minuto <= minuto && minuto - g.minuto < 3);
          return <div key={p.id} className={'mfo-live-row' + (p.id === principal.id ? ' is-main' : '') + (recente ? ' is-goal' : '')}>
            <span className="h">{nomeClube(p.home_club_id)}</span>
            <b>{c} x {f}</b>
            <span className="a">{nomeClube(p.away_club_id)}</span>
          </div>;
        })}
      </div>

      <div className="mfo-live-controls">
        {!fim ? <>
          <button type="button" onClick={() => setPausado(v => !v)}>{pausado ? '▶ Continuar' : '⏸ Pausar'}</button>
          {[1, 2, 4].map(v => <button key={v} type="button" className={velocidade === v ? 'is-on' : ''} onClick={() => setVelocidade(v)}>{v}x</button>)}
          <button type="button" onClick={pular}>Pular »</button>
        </> : <button type="button" className="is-primary" onClick={onClose}>Continuar</button>}
      </div>
    </div>
  </div>;
}
