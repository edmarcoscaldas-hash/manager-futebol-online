import { useEffect, useMemo, useState } from 'react';

const dinheiro = valor => {
  const n = Number(valor || 0);
  const a = Math.abs(n);
  const sinal = n < 0 ? '-' : '';
  if (a >= 1e6) return sinal + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  if (a >= 1e3) return sinal + 'R$ ' + Math.round(a / 1e3).toLocaleString('pt-BR') + ' mil';
  return sinal + 'R$ ' + a.toLocaleString('pt-BR');
};

const nivel = pct => (pct >= 60 ? 'alto' : pct >= 35 ? 'medio' : 'baixo');

function Barra({ rotulo, pct }) {
  return <div className="mfo-hd-bar-row">
    <span>{rotulo}</span>
    <div className="mfo-hd-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
      <i className={'is-' + nivel(pct)} style={{ width: pct + '%' }} />
    </div>
    <b>{pct}%</b>
  </div>;
}

export default function ClubHeader({ supabase, clubeAtual, tecnico, aba }) {
  const [clube, setClube] = useState(null);
  const [liga, setLiga] = useState(null);
  const [tabela, setTabela] = useState([]);
  const [proxima, setProxima] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const atualizar = () => setVersao(v => v + 1);
    window.addEventListener('mfo:atualizar-cabecalho', atualizar);
    return () => window.removeEventListener('mfo:atualizar-cabecalho', atualizar);
  }, []);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!supabase || !clubeAtual?.id) return;
      const { data: c } = await supabase.from('clubs')
        .select('id,nome,sigla,orcamento,pressao_diretoria,pressao_torcida,league_id')
        .eq('id', clubeAtual.id).maybeSingle();
      if (!ativo || !c) return;
      setClube(c);
      if (!c.league_id) { setLiga(null); setTabela([]); setProxima(null); return; }
      const [ligaRes, tabelaRes, jogosRes] = await Promise.all([
        supabase.from('leagues').select('id,nome,pais,divisao,temporada').eq('id', c.league_id).maybeSingle(),
        supabase.from('league_standings').select('club_id,club_name,played,points,goal_difference,goals_for').eq('league_id', c.league_id),
        supabase.from('current_season_matches').select('id,round_number,match_date,home_club_id,away_club_id')
          .eq('league_id', c.league_id).eq('status', 'scheduled')
          .or('home_club_id.eq.' + c.id + ',away_club_id.eq.' + c.id)
          .order('round_number').limit(1)
      ]);
      if (!ativo) return;
      setLiga(ligaRes.data || null);
      setTabela(tabelaRes.data || []);
      setProxima(jogosRes.data?.[0] || null);
    }
    carregar();
    return () => { ativo = false; };
  }, [supabase, clubeAtual?.id, aba, versao]);

  const posicoes = useMemo(() => {
    const iniciou = tabela.some(t => Number(t.played) > 0);
    if (!iniciou) return {};
    const ordenada = [...tabela].sort((a, b) =>
      b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for ||
      String(a.club_name).localeCompare(String(b.club_name), 'pt-BR'));
    return Object.fromEntries(ordenada.map((t, i) => [t.club_id, i + 1]));
  }, [tabela]);

  if (!clubeAtual) return null;
  const c = clube || clubeAtual;
  const minhaPos = posicoes[c.id];
  const confDiretoria = Math.max(0, Math.min(100, 100 - Number(c.pressao_diretoria ?? 50)));
  const confTorcida = Math.max(0, Math.min(100, 100 - Number(c.pressao_torcida ?? 50)));

  let linhaJogo = null;
  let linhaAdversario = null;
  let dataJogo = null;
  if (proxima) {
    const emCasa = proxima.home_club_id === c.id;
    const advId = emCasa ? proxima.away_club_id : proxima.home_club_id;
    const adv = tabela.find(t => t.club_id === advId);
    linhaJogo = (liga ? liga.divisao + ' - ' : '') + proxima.round_number + 'ª rodada';
    linhaAdversario = (emCasa ? 'C' : 'F') + ' - ' + (adv?.club_name || 'Adversário') + (posicoes[advId] ? ' (' + posicoes[advId] + 'º)' : '');
    dataJogo = proxima.match_date ? new Date(proxima.match_date).toLocaleDateString('pt-BR') : null;
  }

  return <header className="mfo-hd" aria-label="Resumo do clube">
    <div className="mfo-hd-club">
      <div className="mfo-hd-crest">{c.sigla || (c.nome || 'MFO').slice(0, 3).toUpperCase()}</div>
      <div className="mfo-hd-id">
        <strong className="mfo-hd-name">{c.nome}{minhaPos ? <em> ({minhaPos}º)</em> : null}</strong>
        <span className="mfo-hd-coach">{tecnico || 'Técnico'}{liga ? ' • Temporada ' + liga.temporada : ''}</span>
      </div>
    </div>

    <div className="mfo-hd-next">
      <span className="mfo-hd-kicker">PRÓXIMO JOGO{dataJogo ? ' • ' + dataJogo : ''}</span>
      {proxima ? <>
        <span className="mfo-hd-line">{linhaJogo}</span>
        <strong className="mfo-hd-opp">{linhaAdversario}</strong>
      </> : <span className="mfo-hd-line">{liga ? 'Sem jogos pendentes. Veja Competições.' : 'Clube sem liga definida.'}</span>}
    </div>

    <div className="mfo-hd-stats">
      <Barra rotulo="Confiança Diretoria" pct={confDiretoria} />
      <Barra rotulo="Confiança Torcida" pct={confTorcida} />
      <div className="mfo-hd-cash"><span>Saldo</span><b className={Number(c.orcamento) < 0 ? 'neg' : ''}>{dinheiro(c.orcamento)}</b></div>
    </div>
  </header>;
}
