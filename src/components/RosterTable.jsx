import { useMemo, useState } from 'react';

const ORDEM_POSICOES = ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Ponta', 'Atacante'];
const GRUPO = { Goleiro: 'gol', Zagueiro: 'def', Lateral: 'def', Volante: 'mei', Meia: 'mei', Ponta: 'ata', Atacante: 'ata' };

const dinheiro = valor => {
  const n = Number(valor || 0);
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  if (n >= 1e3) return 'R$ ' + Math.round(n / 1e3).toLocaleString('pt-BR') + ' mil';
  return 'R$ ' + n.toLocaleString('pt-BR');
};

const calcularIdade = nascimento => {
  if (!nascimento) return null;
  const d = new Date(nascimento + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade -= 1;
  return idade;
};

const normalizar = texto => String(texto || '').toLocaleLowerCase('pt-BR');
const FILTROS_INICIAIS = { busca: '', posicao: 'Todas', forcaMin: '0', caracteristica: 'Todas', idadeMin: '', idadeMax: '', valorMax: '', estrela: false, venda: false, emprestimo: false };

export default function RosterTable({ jogadores, onDisponibilidade, onRenovar, estilos }) {
  const [f, setF] = useState(FILTROS_INICIAIS);
  const [ordem, setOrdem] = useState('posicao');
  const [abertos, setAbertos] = useState(false);
  const atualizar = (campo, valor) => setF(atual => ({ ...atual, [campo]: valor }));

  const linhas = useMemo(() => jogadores.map(j => ({ ...j, _idade: calcularIdade(j.data_nascimento) })), [jogadores]);

  const caracteristicas = useMemo(() => {
    const todas = new Set();
    linhas.forEach(j => (j.caracteristicas || []).forEach(c => todas.add(c)));
    return [...todas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [linhas]);

  const visiveis = useMemo(() => {
    const filtradas = linhas.filter(j => {
      if (f.busca && !normalizar(j.nome).includes(normalizar(f.busca))) return false;
      if (f.posicao !== 'Todas' && j.posicao !== f.posicao) return false;
      if (Number(f.forcaMin) > 0 && Number(j.overall || 0) < Number(f.forcaMin)) return false;
      if (f.caracteristica !== 'Todas' && !(j.caracteristicas || []).includes(f.caracteristica)) return false;
      if (f.idadeMin !== '' && (j._idade ?? 0) < Number(f.idadeMin)) return false;
      if (f.idadeMax !== '' && (j._idade ?? 99) > Number(f.idadeMax)) return false;
      if (f.valorMax !== '' && Number(j.valor_mercado || 0) > Number(f.valorMax) * 1e6) return false;
      if (f.estrela && !j.is_star) return false;
      if (f.venda && !j.disponivel_transferencia) return false;
      if (f.emprestimo && !j.disponivel_emprestimo) return false;
      return true;
    });
    const por = {
      posicao: (a, b) => ORDEM_POSICOES.indexOf(a.posicao) - ORDEM_POSICOES.indexOf(b.posicao) || Number(b.overall || 0) - Number(a.overall || 0),
      forca: (a, b) => Number(b.overall || 0) - Number(a.overall || 0),
      idade: (a, b) => (a._idade ?? 99) - (b._idade ?? 99),
      valor: (a, b) => Number(b.valor_mercado || 0) - Number(a.valor_mercado || 0),
      salario: (a, b) => Number(b.salario_mensal || 0) - Number(a.salario_mensal || 0),
      energia: (a, b) => Number(a.energia ?? 100) - Number(b.energia ?? 100),
      nome: (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')
    }[ordem];
    return filtradas.sort(por);
  }, [linhas, f, ordem]);

  const folha = useMemo(() => linhas.filter(j => !j.is_youth).reduce((t, j) => t + Number(j.salario_mensal || 0), 0), [linhas]);
  const filtrosAtivos = JSON.stringify(f) !== JSON.stringify(FILTROS_INICIAIS);

  return <>
    <div className="mfo-rf">
      <div className="mfo-rf-main">
        <label>Buscar jogador
          <input value={f.busca} onChange={e => atualizar('busca', e.target.value)} placeholder="Nome do atleta" />
        </label>
        <label>Ordenar por
          <select value={ordem} onChange={e => setOrdem(e.target.value)}>
            <option value="posicao">Posição</option>
            <option value="forca">Força</option>
            <option value="idade">Idade</option>
            <option value="valor">Valor</option>
            <option value="salario">Salário</option>
            <option value="energia">Energia (menor primeiro)</option>
            <option value="nome">Nome</option>
          </select>
        </label>
        <button type="button" className="mfo-rf-toggle" onClick={() => setAbertos(v => !v)} aria-expanded={abertos}>
          Filtros{filtrosAtivos ? ' •' : ''} {abertos ? '▲' : '▼'}
        </button>
      </div>
      {abertos && <div className="mfo-rf-adv">
        <label>Posição
          <select value={f.posicao} onChange={e => atualizar('posicao', e.target.value)}>
            {['Todas', ...ORDEM_POSICOES].map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Força mínima
          <select value={f.forcaMin} onChange={e => atualizar('forcaMin', e.target.value)}>
            <option value="0">Qualquer</option>
            {[40, 50, 60, 70, 80].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label>Característica
          <select value={f.caracteristica} onChange={e => atualizar('caracteristica', e.target.value)}>
            <option>Todas</option>
            {caracteristicas.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Idade mínima
          <input type="number" min="15" max="50" value={f.idadeMin} onChange={e => atualizar('idadeMin', e.target.value)} placeholder="15" />
        </label>
        <label>Idade máxima
          <input type="number" min="15" max="50" value={f.idadeMax} onChange={e => atualizar('idadeMax', e.target.value)} placeholder="50" />
        </label>
        <label>Valor máximo (R$ mi)
          <input type="number" min="0" step="0.5" value={f.valorMax} onChange={e => atualizar('valorMax', e.target.value)} placeholder="Sem limite" />
        </label>
        <div className="mfo-rf-checks">
          <label><input type="checkbox" checked={f.estrela} onChange={e => atualizar('estrela', e.target.checked)} /> Estrela ★</label>
          <label><input type="checkbox" checked={f.venda} onChange={e => atualizar('venda', e.target.checked)} /> À venda</label>
          <label><input type="checkbox" checked={f.emprestimo} onChange={e => atualizar('emprestimo', e.target.checked)} /> Empréstimo</label>
        </div>
        <button type="button" style={estilos?.secondary} onClick={() => setF(FILTROS_INICIAIS)}>Limpar filtros</button>
      </div>}
    </div>

    <div className="mfo-rf-summary">
      <strong>{visiveis.length} de {linhas.length} jogadores</strong>
      <span>Folha mensal: {dinheiro(folha)}</span>
    </div>

    {visiveis.length === 0
      ? <p style={{ opacity: .8 }}>Nenhum atleta corresponde aos filtros selecionados.</p>
      : <div className="mfo-roster-wrap"><table className="mfo-roster-table">
        <thead><tr><th>Jogador</th><th>Pos.</th><th>Idade</th><th>Energia</th><th>OVR</th><th>POT</th><th>Valor</th><th>Salário</th><th>Contrato</th><th>Situação</th><th>Ações</th></tr></thead>
        <tbody>
          {visiveis.map(j => {
            const energia = Math.max(0, Math.min(100, Number(j.energia ?? 100)));
            const status = j.disponivel_transferencia ? 'À venda' : j.disponivel_emprestimo ? 'Empréstimo' : 'No elenco';
            const tag = j.disponivel_transferencia ? 'sale' : j.disponivel_emprestimo ? 'loan' : 'ok';
            const iniciais = String(j.nome || 'J').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
            return <tr key={j.id} data-grupo={GRUPO[j.posicao] || 'mei'}>
              <td><div className="mfo-pl">
                <div className="mfo-pl-avatar">{iniciais}</div>
                <div>
                  <span className="mfo-pl-name">{j.nome}{j.is_star && <span className="mfo-star"> ★</span>}{j.is_youth && <span className="mfo-youth"> base</span>}</span>
                  <span className="mfo-pl-sub">{(j.caracteristicas || []).join('/') || j.nacionalidade || '—'}</span>
                </div>
              </div></td>
              <td>{j.posicao || '—'}</td>
              <td>{j._idade ?? '—'}</td>
              <td><span className={'mfo-energy ' + (energia >= 80 ? 'is-ok' : energia >= 50 ? 'is-mid' : 'is-low')}>{energia}%</span></td>
              <td><span className={'mfo-ovr ' + (Number(j.overall) >= 80 ? 'is-high' : '')}>{j.overall ?? '-'}</span></td>
              <td className="mfo-pot">{j.potencial ?? '-'}</td>
              <td>{dinheiro(j.valor_mercado)}</td>
              <td>{Number(j.salario_mensal) > 0 ? dinheiro(j.salario_mensal) : '—'}</td>
              <td>{j.contrato_ate ? new Date(j.contrato_ate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}</td>
              <td><span className={'mfo-tag ' + tag}>{status}</span></td>
              <td><div className="mfo-roster-actions">
                <button style={estilos?.secondary} onClick={() => onDisponibilidade(j, 'venda')}>{j.disponivel_transferencia ? 'Retirar venda' : 'Vender'}</button>
                <button style={estilos?.secondary} onClick={() => onDisponibilidade(j, 'emprestimo')}>{j.disponivel_emprestimo ? 'Retirar empréstimo' : 'Emprestar'}</button>
                <button style={estilos?.primary} onClick={() => onRenovar(j)}>Renovar</button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table></div>}
  </>;
}
