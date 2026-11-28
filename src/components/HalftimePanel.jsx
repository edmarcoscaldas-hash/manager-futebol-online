import { useMemo, useState } from 'react';
import { avisoContrato } from '../lib/contrato.js';

const FORMACOES = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3', '4-5-1'];
const ESTILOS = [['defensive', 'Defensivo'], ['balanced', 'Equilibrado'], ['offensive', 'Ofensivo']];
const MENTALIDADES = [['very_defensive', 'Muito defensiva'], ['defensive', 'Defensiva'], ['normal', 'Normal'], ['offensive', 'Ofensiva'], ['very_offensive', 'Muito ofensiva']];
const SIGLA = { Goleiro: 'GOL', Zagueiro: 'ZAG', Lateral: 'LAT', Volante: 'VOL', Meia: 'MEI', Ponta: 'PON', Atacante: 'ATA' };
const MAX_TROCAS = 5;

function nivelEnergia(e) { return e >= 80 ? 'ok' : e >= 55 ? 'mid' : 'low'; }

function Linha({ jogador, contrato, selecionado, desabilitado, onClick, extra }) {
  const energia = Math.max(0, Math.min(100, Number(jogador.energia ?? 100)));
  const aviso = avisoContrato(contrato);
  return <button type="button" className={'mfo-ht-player' + (selecionado ? ' is-selected' : '') + (desabilitado ? ' is-disabled' : '')}
    onClick={onClick} disabled={desabilitado} aria-pressed={selecionado}>
    <span className="mfo-ht-pos">{SIGLA[jogador.posicao] || '—'}</span>
    <span className="mfo-ht-info">
      <b>{jogador.nome}{extra}</b>
      <span className="mfo-ht-meta">OVR {jogador.overall ?? '-'} • {(jogador.caracteristicas || []).join('/') || '—'}</span>
      {aviso && <span className={'mfo-contract is-' + aviso.nivel}>⚠ {aviso.texto}</span>}
    </span>
    <span className="mfo-ht-energy">
      <span className={'mfo-ht-energy-bar is-' + nivelEnergia(energia)}><i style={{ width: energia + '%' }} /></span>
      <small>{energia}%</small>
    </span>
  </button>;
}

export default function HalftimePanel({ estado, contratos = {}, carregando, erro, onConfirmar }) {
  const squad = estado.squad || [];
  const titulares = useMemo(() => squad.filter(j => j.titular).sort((a, b) => a.ordem - b.ordem), [squad]);
  const reservas = useMemo(() => squad.filter(j => !j.titular).sort((a, b) => a.ordem - b.ordem), [squad]);

  const [formacao, setFormacao] = useState(estado.formation || '4-3-3');
  const [estilo, setEstilo] = useState(estado.style || 'balanced');
  const [mentalidade, setMentalidade] = useState(estado.mentality || 'normal');
  const [trocas, setTrocas] = useState([]);
  const [saindo, setSaindo] = useState(null);
  const [aviso, setAviso] = useState('');

  const porId = useMemo(() => Object.fromEntries(squad.map(j => [j.id, j])), [squad]);
  const entraram = trocas.map(t => t.in);
  const sairam = trocas.map(t => t.out);

  const emCampo = titulares.map(t => {
    const troca = trocas.find(x => x.out === t.id);
    return troca ? { ...porId[troca.in], _entrou: true, _no_lugar_de: t.nome } : t;
  });
  const banco = reservas.filter(r => !entraram.includes(r.id));
  const comContratoAcabando = squad.filter(j => avisoContrato(contratos[j.id]));

  function tocarEmCampo(j) {
    setAviso('');
    if (j._entrou) return;
    setSaindo(atual => (atual === j.id ? null : j.id));
  }
  function tocarNoBanco(r) {
    setAviso('');
    if (!saindo) { setAviso('Escolha primeiro quem sai (toque em um jogador em campo).'); return; }
    if (trocas.length >= MAX_TROCAS) { setAviso('Limite de ' + MAX_TROCAS + ' substituições.'); return; }
    const quemSai = porId[saindo];
    if ((quemSai.posicao === 'Goleiro') !== (r.posicao === 'Goleiro')) {
      setAviso('Goleiro só pode ser trocado por outro goleiro.');
      return;
    }
    setTrocas(lista => [...lista, { out: saindo, in: r.id }]);
    setSaindo(null);
  }
  function desfazer(i) { setTrocas(lista => lista.filter((_, k) => k !== i)); setAviso(''); }

  return <div className="mfo-ht">
    <h4 className="mfo-ht-title">Intervalo — decisões para o 2º tempo</h4>

    {comContratoAcabando.length > 0 && <div className="mfo-ht-alert" role="status">
      ⚠ {comContratoAcabando.length === 1 ? '1 jogador do jogo atual está' : comContratoAcabando.length + ' jogadores do jogo atual estão'} com contrato encerrando: {comContratoAcabando.slice(0, 4).map(j => j.nome).join(', ')}{comContratoAcabando.length > 4 ? '…' : ''}. Renove em Elenco.
    </div>}

    <div className="mfo-ht-tactics">
      <label>Formação
        <select value={formacao} onChange={e => setFormacao(e.target.value)}>{FORMACOES.map(f => <option key={f}>{f}</option>)}</select>
      </label>
      <label>Estilo
        <select value={estilo} onChange={e => setEstilo(e.target.value)}>{ESTILOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
      </label>
      <label>Mentalidade
        <select value={mentalidade} onChange={e => setMentalidade(e.target.value)}>{MENTALIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
      </label>
    </div>

    <div className="mfo-ht-subs-head">
      <b>Substituições: {trocas.length}/{MAX_TROCAS}</b>
      <span>Toque em quem sai e depois em quem entra</span>
    </div>
    {trocas.length > 0 && <div className="mfo-ht-pending">
      {trocas.map((t, i) => <span key={i} className="mfo-ht-chip">
        {porId[t.out]?.nome} ⇄ {porId[t.in]?.nome}
        <button type="button" onClick={() => desfazer(i)} aria-label="Desfazer substituição">×</button>
      </span>)}
    </div>}
    {aviso && <p className="mfo-ht-warn" role="alert">{aviso}</p>}

    <div className="mfo-ht-cols">
      <div>
        <h5>Em campo</h5>
        {emCampo.map(j => <Linha key={j.id} jogador={j} contrato={contratos[j.id]} selecionado={saindo === j.id}
          desabilitado={Boolean(j._entrou)} onClick={() => tocarEmCampo(j)}
          extra={j._entrou ? ' (entra)' : ''} />)}
      </div>
      <div>
        <h5>Banco</h5>
        {banco.length === 0 ? <p className="mfo-live-muted">Sem reservas disponíveis.</p> :
          banco.map(r => <Linha key={r.id} jogador={r} contrato={contratos[r.id]} selecionado={false} onClick={() => tocarNoBanco(r)} />)}
        {sairam.length > 0 && <p className="mfo-live-muted">Quem sai não volta ao jogo.</p>}
      </div>
    </div>

    {erro && <p className="mfo-ht-warn" role="alert">{erro}</p>}
    <button type="button" className="mfo-ht-go" disabled={carregando}
      onClick={() => onConfirmar({ formation: formacao, style: estilo, mentality: mentalidade, subs: trocas })}>
      {carregando ? 'Iniciando o 2º tempo...' : 'Começar o 2º tempo'}
    </button>
  </div>;
}
