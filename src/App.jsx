import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import LeagueModule from './components/LeagueModule.jsx';
import RankingsModule from './components/RankingsModule.jsx';
import TacticsModule from './components/TacticsModule.jsx';
import DashboardModule from './components/DashboardModule.jsx';
import MultiplayerLobby from './components/MultiplayerLobby.jsx';
import './layout.css';

export default function App() {
  const [aba, setAba] = useState('Início');
  const [menuAberto, setMenuAberto] = useState(false);
  const [maisModulosAbertos, setMaisModulosAbertos] = useState(false);
  const [session, setSession] = useState(null);
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [demo, setDemo] = useState(false);
  const [clubes, setClubes] = useState([]);
  const [carregandoClubes, setCarregandoClubes] = useState(false);
  const [carreira, setCarreira] = useState(null);
  const [clubesDisponiveis, setClubesDisponiveis] = useState([]);
  const [clubeSelecionado, setClubeSelecionado] = useState('');
  const [iniciandoCarreira, setIniciandoCarreira] = useState(false);
  const [nomeClube, setNomeClube] = useState('');
  const [sigla, setSigla] = useState('');
  const [cidade, setCidade] = useState('');
  const [estadio, setEstadio] = useState('');
  const [capacidade, setCapacidade] = useState('10000');
  const [erroClube, setErroClube] = useState('');
  const [mensagemEstadio, setMensagemEstadio] = useState('');
  const [carregandoEstadio, setCarregandoEstadio] = useState(false);
  const [movimentacoesFinanceiras, setMovimentacoesFinanceiras] = useState([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState({ receitas: 0, despesas: 0, total_movimentacoes: 0, ticket_price: 50 });
  const [precoIngressoInput, setPrecoIngressoInput] = useState('50');
  const [salvandoPrecoIngresso, setSalvandoPrecoIngresso] = useState(false);
  const [carregandoFinancas, setCarregandoFinancas] = useState(false);
  const [erroFinancas, setErroFinancas] = useState('');
  const [mensagemFinancas, setMensagemFinancas] = useState('');
  const [tipoLancamento, setTipoLancamento] = useState('despesa');
  const [categoriaLancamento, setCategoriaLancamento] = useState('Salários');
  const [descricaoLancamento, setDescricaoLancamento] = useState('');
  const [valorLancamento, setValorLancamento] = useState('');
  const [salvandoLancamento, setSalvandoLancamento] = useState(false);
  const [propostasPatrocinio, setPropostasPatrocinio] = useState([]);
  const [temporadaPatrocinio, setTemporadaPatrocinio] = useState(1);
  const [aceitandoPatrocinio, setAceitandoPatrocinio] = useState(false);
  const [respostaImprensa, setRespostaImprensa] = useState('');
  const [impactoImprensa, setImpactoImprensa] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [buscaElenco, setBuscaElenco] = useState('');
  const [posicaoElenco, setPosicaoElenco] = useState('Todas');
  const [jogadoresBase, setJogadoresBase] = useState([]);
  const [candidatosBase, setCandidatosBase] = useState([]);
  const [carregandoBase, setCarregandoBase] = useState(false);
  const [gerandoPeneira, setGerandoPeneira] = useState(false);
  const [mensagemBase, setMensagemBase] = useState('');
  const [erroBase, setErroBase] = useState('');
  const [peneirasTemporada, setPeneirasTemporada] = useState(0);
  const [temporadaBase, setTemporadaBase] = useState(1);
  const [categoriaBaseSelecionada, setCategoriaBaseSelecionada] = useState('Todas');
  const [treinandoBase, setTreinandoBase] = useState(false);
  const [ultimoTreinoBase, setUltimoTreinoBase] = useState(null);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [novoJogador, setNovoJogador] = useState({ nome: '', posicao: 'Atacante', data_nascimento: '', overall: 50 });
  const [erroElenco, setErroElenco] = useState('');
  const [mensagemElenco, setMensagemElenco] = useState('');
  const [ligaPais, setLigaPais] = useState('Brasil');
  const [ligaDivisao, setLigaDivisao] = useState('1ª divisão');
  const [jogadoresMercado, setJogadoresMercado] = useState([]);
  const [clubesMercado, setClubesMercado] = useState([]);
  const [ligasMercado, setLigasMercado] = useState([]);
  const [carregandoMercado, setCarregandoMercado] = useState(false);
  const [erroMercado, setErroMercado] = useState('');
  const [jogadorOferta, setJogadorOferta] = useState(null);
  const [tipoOferta, setTipoOferta] = useState('compra');
  const [valorOferta, setValorOferta] = useState('0');
  const [salarioOferta, setSalarioOferta] = useState('3000');
  const [mesesOferta, setMesesOferta] = useState('6');
  const [mensagemOferta, setMensagemOferta] = useState('');
  const [enviandoOferta, setEnviandoOferta] = useState(false);
  const [filtroPosicao, setFiltroPosicao] = useState('Todas');
  const [filtroClube, setFiltroClube] = useState('Todos');
  const [filtroLiga, setFiltroLiga] = useState('Todas');
  const [filtroNacionalidade, setFiltroNacionalidade] = useState('Todas');
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState('todos');
  const [overallMin, setOverallMin] = useState('0');
  const [overallMax, setOverallMax] = useState('100');
  const [faixaOverall, setFaixaOverall] = useState('todos');
  const [valorMin, setValorMin] = useState('0');
  const [valorMax, setValorMax] = useState('100000000');
  const clubeAtual = clubes[0];
  const salarioSugerido = jogadorOferta ? Math.round(3000 * Math.pow(Math.max(40, Math.min(100, Number(jogadorOferta.overall || 50))) / 50, 3.6) * (jogadorOferta.is_star ? 1.25 : 1)) : 3000;
  const jogadoresBaseFiltrados = jogadoresBase.filter(j => categoriaBaseSelecionada === 'Todas' || categoriaBase(j.data_nascimento) === categoriaBaseSelecionada);

  const abas = ['Início', 'Elenco', 'Táticas', 'Liga', 'Mercado', 'Base', 'Estádio', 'Finanças', 'Imprensa', 'Rankings'];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let ativo = true;
    async function carregarCarreira() {
      if (!session || !supabase) {
        setClubes([]);
        setCarreira(null);
        setClubesDisponiveis([]);
        return;
      }
      setCarregandoClubes(true);
      setErroClube('');
      const nomeTreinador = session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Treinador';
      const { data: careerId, error: careerError } = await supabase.rpc('create_manager_career', {
        p_manager_name: nomeTreinador
      });
      if (!ativo) return;
      if (careerError) {
        setErroClube('Não foi possível carregar sua carreira: ' + careerError.message);
        setCarregandoClubes(false);
        return;
      }
      setCarreira({ id: careerId, manager_name: nomeTreinador });
      const { data: empregos, error: empregoError } = await supabase
        .from('manager_employments')
        .select('id,club_id,salary,contract_end,status')
        .eq('career_id', careerId)
        .eq('status', 'active')
        .limit(1);
      if (!ativo) return;
      if (empregoError) {
        setErroClube('Não foi possível consultar seu clube atual: ' + empregoError.message);
        setCarregandoClubes(false);
        return;
      }
      if (empregos?.length) {
        const { data: club, error: clubError } = await supabase
          .from('clubs').select('*').eq('id', empregos[0].club_id).single();
        if (!ativo) return;
        if (clubError) setErroClube('Não foi possível carregar o clube da carreira: ' + clubError.message);
        else setClubes(club ? [club] : []);
        setClubesDisponiveis([]);
      } else {
        setClubes([]);
        const [aiRes, ownRes] = await Promise.all([
          supabase.from('clubs').select('id,nome,pais,cidade,league_id,is_ai').eq('is_ai', true).order('nome'),
          supabase.from('clubs').select('id,nome,pais,cidade,league_id,is_ai').eq('owner_id', session.user.id).eq('is_ai', false).order('nome')
        ]);
        if (!ativo) return;
        if (aiRes.error || ownRes.error) {
          setErroClube('Não foi possível carregar os clubes disponíveis: ' + (aiRes.error || ownRes.error).message);
        } else {
          const options = [...(ownRes.data || []), ...(aiRes.data || [])];
          setClubesDisponiveis(options);
          setClubeSelecionado(options[0]?.id || '');
        }
      }
      setCarregandoClubes(false);
    }
    carregarCarreira();
    return () => { ativo = false; };
  }, [session]);

  useEffect(() => {
    let ativo = true;
    async function carregarJogadores() {
      if (!clubeAtual?.id || !supabase || aba !== 'Elenco') return;
      setCarregandoJogadores(true);
      await supabase.rpc('process_expired_player_contracts');
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', clubeAtual.id)
        .eq('is_youth', false)
        .order('created_at', { ascending: true });
      if (!ativo) return;
      if (error) setErroElenco('Não foi possível carregar o elenco: ' + error.message);
      else setJogadores(data || []);
      setCarregandoJogadores(false);
    }
    carregarJogadores();
    return () => { ativo = false; };
  }, [clubeAtual?.id, aba]);

  useEffect(() => {
    let ativo = true;
    async function carregarMercado() {
      if (!session || !supabase || aba !== 'Mercado') return;
      setCarregandoMercado(true);
      setErroMercado('');
      await supabase.rpc('process_expired_player_loans');
      await supabase.rpc('process_expired_player_contracts');
      const [playersRes, clubsRes, leaguesRes] = await Promise.all([
        supabase.from('players').select('*').eq('is_youth', false).order('overall', { ascending: false }),
        supabase.from('clubs').select('id,nome,pais,league_id').order('nome'),
        supabase.from('leagues').select('id,nome,pais,divisao,temporada').order('pais').order('divisao')
      ]);
      if (!ativo) return;
      if (playersRes.error) setErroMercado('Erro ao carregar jogadores: ' + playersRes.error.message);
      else setJogadoresMercado(playersRes.data || []);
      if (clubsRes.error) setErroMercado('Erro ao carregar clubes para os filtros: ' + clubsRes.error.message);
      else setClubesMercado(clubsRes.data || []);
      if (leaguesRes.error) setErroMercado('Erro ao carregar ligas: ' + leaguesRes.error.message);
      else setLigasMercado(leaguesRes.data || []);
      setCarregandoMercado(false);
    }
    carregarMercado();
    return () => { ativo = false; };
  }, [session, aba]);

  useEffect(() => {
    let ativo = true;
    async function carregarFinancas() {
      if (!session || !clubeAtual?.id || !supabase || aba !== 'Finanças') return;
      setCarregandoFinancas(true);
      setErroFinancas('');
      const { data: patrocinioInfo, error: erroPatrocinio } = await supabase.rpc('ensure_sponsorship_offers', { p_club_id: clubeAtual.id });
      if (!ativo) return;
      if (erroPatrocinio) setErroFinancas('Não foi possível carregar o patrocínio: ' + erroPatrocinio.message);
      else {
        const temporadaAtual = Number(patrocinioInfo?.temporada || 1);
        setTemporadaPatrocinio(temporadaAtual);
        const { data: ofertas, error: erroOfertas } = await supabase
          .from('sponsorship_offers')
          .select('*')
          .eq('club_id', clubeAtual.id)
          .eq('temporada', temporadaAtual)
          .order('valor', { ascending: false });
        if (erroOfertas) setErroFinancas('Não foi possível consultar as propostas: ' + erroOfertas.message);
        else setPropostasPatrocinio(ofertas || []);
      }
      const [summaryRes, transactionsRes] = await Promise.all([
        supabase.rpc('get_financial_summary', { p_club_id: clubeAtual.id }),
        supabase.from('financial_transactions').select('*').eq('club_id', clubeAtual.id)
          .order('created_at', { ascending: false }).limit(100)
      ]);
      if (!ativo) return;
      if (summaryRes.error) setErroFinancas('Não foi possível carregar o resumo financeiro: ' + summaryRes.error.message);
      else {
        const summary = summaryRes.data || { receitas: 0, despesas: 0, total_movimentacoes: 0, ticket_price: 50 };
        setResumoFinanceiro(summary);
        setPrecoIngressoInput(String(summary.ticket_price || 50));
      }
      if (transactionsRes.error) setErroFinancas('Não foi possível carregar o histórico: ' + transactionsRes.error.message);
      else setMovimentacoesFinanceiras(transactionsRes.data || []);
      setCarregandoFinancas(false);
    }
    carregarFinancas();
    return () => { ativo = false; };
  }, [session, clubeAtual?.id, aba]);

  const receitasFinanceiras = Number(resumoFinanceiro.receitas || 0);
  const despesasFinanceiras = Number(resumoFinanceiro.despesas || 0);

  const clubesDisponiveisNoFiltro = filtroLiga === 'Todas'
    ? clubesMercado
    : clubesMercado.filter(c => c.league_id === filtroLiga);
  const jogadoresDaLigaSelecionada = jogadoresMercado.filter(j => {
    if (filtroLiga === 'Todas') return true;
    const clube = clubesMercado.find(c => c.id === j.club_id);
    return clube?.league_id === filtroLiga;
  });
  const nacionalidadesDisponiveis = [...new Set(
    jogadoresDaLigaSelecionada
      .filter(j => filtroClube === 'Todos' || j.club_id === filtroClube)
      .map(j => j.nacionalidade)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const jogadoresFiltrados = jogadoresMercado.filter(j => {
    const clube = clubesMercado.find(c => c.id === j.club_id);
    const posicaoOk = filtroPosicao === 'Todas' || j.posicao === filtroPosicao;
    const clubeOk = filtroClube === 'Todos' || j.club_id === filtroClube;
    const ligaOk = filtroLiga === 'Todas' || clube?.league_id === filtroLiga;
    const nacionalidadeOk = filtroNacionalidade === 'Todas' || j.nacionalidade === filtroNacionalidade;
    const disponibilidadeOk = filtroDisponibilidade === 'todos'
      || (filtroDisponibilidade === 'transferencia' && j.disponivel_transferencia && j.status_contrato !== 'livre')
      || (filtroDisponibilidade === 'emprestimo' && j.disponivel_emprestimo && j.status_contrato !== 'livre')
      || (filtroDisponibilidade === 'livre' && j.status_contrato === 'livre');
    const overall = Number(j.overall || 0);
    const valor = Number(j.valor_mercado || 0);
    return posicaoOk && clubeOk && ligaOk && nacionalidadeOk && disponibilidadeOk
      && overall >= Number(overallMin || 0) && overall <= Number(overallMax || 100)
      && valor >= Number(valorMin || 0) && valor <= Number(valorMax || 100000000);
  });


  useEffect(() => {
    let ativo = true;
    async function carregarBase() {
      if (!clubeAtual?.id || !supabase || aba !== 'Base') return;
      setCarregandoBase(true);
      setErroBase('');
      const [jovensRes, candidatosRes, peneirasRes, treinoRes] = await Promise.all([
        supabase.from('players').select('*').eq('club_id', clubeAtual.id).eq('is_youth', true).order('overall', { ascending: false }),
        supabase.from('academy_trials').select('*').eq('club_id', clubeAtual.id).eq('status', 'disponivel').order('created_at', { ascending: false }),
        supabase.from('academy_trials').select('peneira_id,temporada').eq('club_id', clubeAtual.id),
        supabase.from('academy_training_sessions').select('week_start,trained_at,players_trained,points_added').eq('club_id', clubeAtual.id).order('week_start', { ascending: false }).limit(1).maybeSingle()
      ]);
      if (!ativo) return;
      if (jovensRes.error) setErroBase('Não foi possível carregar a base: ' + jovensRes.error.message);
      else setJogadoresBase(jovensRes.data || []);
      if (candidatosRes.error) setErroBase('Não foi possível carregar os candidatos: ' + candidatosRes.error.message);
      else setCandidatosBase(candidatosRes.data || []);
      if (peneirasRes.error) setErroBase('Não foi possível consultar o limite de peneiras: ' + peneirasRes.error.message);
      else {
        const registros = peneirasRes.data || [];
        setPeneirasTemporada(new Set(registros.map(item => item.peneira_id)).size);
        setTemporadaBase(registros[0]?.temporada || 1);
      }
      setUltimoTreinoBase(treinoRes.error ? null : (treinoRes.data || null));
      setCarregandoBase(false);
    }
    carregarBase();
    return () => { ativo = false; };
  }, [clubeAtual?.id, aba]);

  function idadeJogador(dataNascimento) {
    if (!dataNascimento) return 0;
    const nascimento = new Date(dataNascimento + 'T12:00:00');
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    if (hoje.getMonth() < nascimento.getMonth() || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  }

  function categoriaBase(dataNascimento) {
    const idade = idadeJogador(dataNascimento);
    if (idade >= 14 && idade <= 15) return 'Sub-15';
    if (idade >= 16 && idade <= 17) return 'Sub-17';
    if (idade >= 18 && idade <= 20) return 'Sub-20';
    return 'Fora da base';
  }

  async function abrirPeneira() {
    if (!clubeAtual?.id || !supabase) return;
    if (peneirasTemporada >= 2) {
      setErroBase('Limite atingido: seu clube já realizou 2 peneiras nesta temporada.');
      setMensagemBase('');
      return;
    }
    setGerandoPeneira(true);
    setErroBase('');
    setMensagemBase('');
    const { data: profissionais, error: erroProfissionais } = await supabase
      .from('players')
      .select('overall')
      .eq('club_id', clubeAtual.id)
      .eq('is_youth', false);
    if (erroProfissionais) {
      setErroBase('Não foi possível avaliar o elenco profissional: ' + erroProfissionais.message);
      setGerandoPeneira(false);
      return;
    }
    const mediaProfissional = profissionais?.length
      ? profissionais.reduce((s, p) => s + Number(p.overall || 0), 0) / profissionais.length
      : 60;
    const tetoComum = Math.max(25, Math.min(52, Math.floor(mediaProfissional - 5)));
    const tetoEstrela = Math.max(25, Math.min(62, Math.floor(mediaProfissional - 1)));
    const primeiros = ['Lucas','Gabriel','Matheus','Pedro','Rafael','João','Bruno','Thiago','Felipe','Gustavo','Daniel','André','Caio','Vitor','Enzo','Arthur','Leonardo','Samuel','Davi','Murilo','Igor','Eduardo','Heitor','Renan','Alex','Marcos','Vinícius','Luan','Nicolas','Miguel','Bernardo','Theo','Antônio','Breno','Ryan','Kevin'];
    const sobrenomes = ['Almeida','Ferreira','Costa','Oliveira','Santos','Pereira','Carvalho','Rodrigues','Martins','Lima','Gomes','Ribeiro','Barbosa','Mendes','Moreira','Nunes','Castro','Silva','Azevedo','Teixeira','Cardoso','Campos','Monteiro','Vieira','Dias','Rocha','Freitas','Moura','Andrade','Souza','Nascimento','Barros'];
    const posicoes = ['Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'];
    const nacionalidades = ['Brasil','Argentina','Uruguai','Colômbia','Portugal','Espanha','França','Alemanha'];
    const peneiraId = crypto.randomUUID();
    const candidatos = Array.from({ length: 5 }, (_, i) => {
      const estrela = Math.random() < 0.07;
      const idade = 14 + Math.floor(Math.random() * 7);
      const hoje = new Date();
      const limiteMaisNovo = new Date(hoje);
      limiteMaisNovo.setFullYear(limiteMaisNovo.getFullYear() - idade);
      const limiteMaisAntigo = new Date(hoje);
      limiteMaisAntigo.setFullYear(limiteMaisAntigo.getFullYear() - idade - 1);
      limiteMaisAntigo.setDate(limiteMaisAntigo.getDate() + 1);
      const nascimento = new Date(limiteMaisAntigo.getTime() + Math.random() * (limiteMaisNovo.getTime() - limiteMaisAntigo.getTime()));
      const maximo = estrela ? tetoEstrela : tetoComum;
      const minimo = Math.min(estrela ? 48 : 35, maximo);
      const overall = minimo + Math.floor(Math.random() * Math.max(1, maximo - minimo + 1));
      const potencial = estrela
        ? Math.max(overall, 75 + Math.floor(Math.random() * 16))
        : Math.max(overall, 55 + Math.floor(Math.random() * 21));
      return {
        club_id: clubeAtual.id,
        peneira_id: peneiraId,
        nome: primeiros[Math.floor(Math.random() * primeiros.length)] + ' ' + sobrenomes[Math.floor(Math.random() * sobrenomes.length)],
        posicao: posicoes[Math.floor(Math.random() * posicoes.length)],
        data_nascimento: nascimento.toISOString().slice(0, 10),
        overall,
        potencial: Math.min(99, potencial),
        nacionalidade: nacionalidades[Math.floor(Math.random() * nacionalidades.length)],
        is_star: estrela,
        status: 'disponivel'
      };
    });
    const { data, error } = await supabase.from('academy_trials').insert(candidatos).select();
    if (error) setErroBase('Não foi possível abrir a peneira: ' + error.message);
    else {
      setCandidatosBase(lista => [...(data || []), ...lista]);
      setPeneirasTemporada(total => total + 1);
      setTemporadaBase(data?.[0]?.temporada || temporadaBase);
      setMensagemBase('Peneira realizada! ' + (data || []).length + ' jovens foram avaliados. Você utilizou ' + (peneirasTemporada + 1) + ' de 2 peneiras nesta temporada.');
    }
    setGerandoPeneira(false);
  }

  async function treinarBase() {
    if (!clubeAtual?.id || !supabase) return;
    setTreinandoBase(true);
    setErroBase('');
    setMensagemBase('');
    const { data, error } = await supabase.rpc('mfo_train_academy_week', { p_club_id: clubeAtual.id });
    if (error) {
      setErroBase('Não foi possível concluir o treino: ' + error.message);
      setTreinandoBase(false);
      return;
    }
    const resultado = Array.isArray(data) ? data[0] : data;
    const { data: jovens, error: erroJovens } = await supabase
      .from('players').select('*').eq('club_id', clubeAtual.id).eq('is_youth', true).order('overall', { ascending: false });
    if (erroJovens) setErroBase('Treino concluído, mas não foi possível atualizar a lista: ' + erroJovens.message);
    else setJogadoresBase(jovens || []);
    setUltimoTreinoBase({
      week_start: new Date().toISOString().slice(0, 10),
      trained_at: new Date().toISOString(),
      players_trained: Number(resultado?.players_trained || 0),
      points_added: Number(resultado?.points_added || 0),
      next_training_at: resultado?.next_training_at || null
    });
    setMensagemBase('Treino concluído: ' + Number(resultado?.players_trained || 0) + ' atleta(s) treinado(s) e ' + Number(resultado?.points_added || 0) + ' ponto(s) de evolução nesta semana.');
    setTreinandoBase(false);
  }

  async function contratarDaBase(candidato) {
    if (!candidato?.id || !clubeAtual?.id || !supabase) return;
    setCarregandoBase(true);
    setErroBase('');
    const { data: jogador, error } = await supabase.from('players').insert({
      club_id: clubeAtual.id,
      nome: candidato.nome,
      posicao: candidato.posicao,
      data_nascimento: candidato.data_nascimento,
      overall: candidato.overall,
      potencial: candidato.potencial,
      nacionalidade: candidato.nacionalidade,
      is_star: candidato.is_star,
      is_youth: true,
      valor_mercado: candidato.is_star ? 180000 : 50000,
      salario: 0,
      salario_mensal: 0,
      status_contrato: 'ativo',
      disponivel_transferencia: false,
      disponivel_emprestimo: false
    }).select().single();
    if (error) {
      setErroBase('Não foi possível contratar o jovem: ' + error.message);
      setCarregandoBase(false);
      return;
    }
    const { error: erroCandidato } = await supabase.from('academy_trials').update({
      status: 'contratado',
      signed_player_id: jogador.id
    }).eq('id', candidato.id);
    setJogadoresBase(lista => [jogador, ...lista]);
    setCandidatosBase(lista => lista.filter(c => c.id !== candidato.id));
    setMensagemBase(erroCandidato
      ? 'Jogador contratado. Não foi possível atualizar o histórico da peneira: ' + erroCandidato.message
      : candidato.nome + ' foi contratado para a categoria de base.');
    setCarregandoBase(false);
  }

  async function dispensarCandidato(candidato) {
    const { error } = await supabase.from('academy_trials').update({ status: 'dispensado' }).eq('id', candidato.id);
    if (error) setErroBase('Não foi possível dispensar o candidato: ' + error.message);
    else {
      setCandidatosBase(lista => lista.filter(c => c.id !== candidato.id));
      setMensagemBase(candidato.nome + ' não foi selecionado nesta peneira.');
    }
  }

  async function promoverJogador(jogador) {
    if (!jogador?.id || !supabase) return;
    const idade = idadeJogador(jogador.data_nascimento);
    if (idade < 18) {
      setErroBase('Jogadores Sub-15 e Sub-17 permanecem em formação. A promoção ao profissional fica disponível a partir dos 18 anos.');
      setMensagemBase('');
      return;
    }
    setCarregandoBase(true);
    const { data, error } = await supabase.from('players').update({ is_youth: false }).eq('id', jogador.id).eq('club_id', clubeAtual.id).select().single();
    if (error) setErroBase('Não foi possível promover o jogador: ' + error.message);
    else {
      setJogadoresBase(lista => lista.filter(j => j.id !== jogador.id));
      setMensagemBase(data.nome + ' foi promovido ao elenco profissional.');
    }
    setCarregandoBase(false);
  }

  async function alterarDisponibilidadeJogador(jogador, tipo) {
    if (!jogador?.id || !clubeAtual?.id || !supabase) return;
    setErroElenco('');
    setMensagemElenco('');
    const atual = tipo === 'venda' ? Boolean(jogador.disponivel_transferencia) : Boolean(jogador.disponivel_emprestimo);
    const atualizacao = tipo === 'venda'
      ? { disponivel_transferencia: !atual, disponivel_emprestimo: false }
      : { disponivel_emprestimo: !atual, disponivel_transferencia: false };
    const { data, error } = await supabase.from('players').update(atualizacao)
      .eq('id', jogador.id).eq('club_id', clubeAtual.id).select().single();
    if (error) setErroElenco('Não foi possível atualizar a disponibilidade: ' + error.message);
    else {
      setJogadores(lista => lista.map(item => item.id === data.id ? data : item));
      setMensagemElenco(data.nome + (tipo === 'venda'
        ? (data.disponivel_transferencia ? ' foi colocado à venda.' : ' foi retirado da lista de venda.')
        : (data.disponivel_emprestimo ? ' foi disponibilizado para empréstimo.' : ' não está mais disponível para empréstimo.')));
    }
  }

  async function renovarContrato(jogador) {
    if (!jogador?.id || !supabase) return;
    const mesesTexto = window.prompt('Prazo desejado: digite 6, 12 ou 24 meses.', '12');
    if (mesesTexto === null) return;
    const meses = Number(mesesTexto);
    if (![6, 12, 24].includes(meses)) {
      setErroElenco('Prazo inválido. Escolha 6, 12 ou 24 meses.');
      return;
    }
    const salarioAtual = Number(jogador.salario_mensal || 0);
    const salarioBase = Math.round(3000 * Math.pow(Math.max(40, Math.min(100, Number(jogador.overall || 50))) / 50, 3.6) * (jogador.is_star ? 1.25 : 1));
    const salarioSugeridoRenovacao = Math.max(Math.round(salarioAtual * 1.10), salarioBase);
    const salarioTexto = window.prompt('O jogador pede pelo menos R$ ' + salarioSugeridoRenovacao.toLocaleString('pt-BR') + ' por mês. Informe sua oferta salarial:', String(salarioSugeridoRenovacao));
    if (salarioTexto === null) return;
    const salario = Number(salarioTexto.replace(/\\./g, '').replace(',', '.'));
    if (!Number.isFinite(salario) || salario <= 0) {
      setErroElenco('Informe um salário mensal válido.');
      return;
    }
    setErroElenco('');
    setMensagemElenco('');
    const { data, error } = await supabase.rpc('renew_player_contract', {
      p_player_id: jogador.id,
      p_duracao_meses: meses,
      p_salario_mensal: salario
    });
    if (error) setErroElenco('Não foi possível renovar o contrato: ' + error.message);
    else if (data?.status === 'contraproposta') {
      setErroElenco(data.message + ' O salário mínimo pedido é R$ ' + Number(data.salario_esperado).toLocaleString('pt-BR') + '.');
    } else {
      setMensagemElenco(data?.message || 'Contrato renovado.');
      const { data: atualizados, error: erroLista } = await supabase.from('players').select('*')
        .eq('club_id', clubeAtual.id).eq('is_youth', false).order('created_at', { ascending: true });
      if (!erroLista) setJogadores(atualizados || []);
    }
  }

  async function enviarProposta(event) {
    event.preventDefault();
    if (!jogadorOferta?.id || !supabase) return;
    setEnviandoOferta(true);
    setMensagemOferta('');
    const { data, error } = await supabase.rpc('submit_player_offer', {
      p_player_id: jogadorOferta.id,
      p_tipo: tipoOferta,
      p_valor: Number(valorOferta || 0),
      p_duracao_meses: tipoOferta === 'emprestimo' ? Number(mesesOferta) : 0,
      p_salario_mensal: Number(salarioOferta || 0)
    });
    if (error) {
      setMensagemOferta('Não foi possível concluir a negociação: ' + error.message);
    } else {
      setMensagemOferta(data?.message || 'Proposta processada.');
      if (data?.status === 'contraproposta' && data?.salario_esperado) {
        setSalarioOferta(String(data.salario_esperado));
        setEnviandoOferta(false);
        return;
      }
      const [playersRes, clubsRes] = await Promise.all([
        supabase.from('players').select('*').order('overall', { ascending: false }),
        supabase.from('clubs').select('*').order('created_at', { ascending: true })
      ]);
      if (!playersRes.error) setJogadoresMercado(playersRes.data || []);
      if (!clubsRes.error) setClubes(clubsRes.data || []);
      setJogadorOferta(null);
    }
    setEnviandoOferta(false);
  }

  async function aceitarPatrocinio(oferta) {
    if (!oferta?.id || !supabase || aceitandoPatrocinio) return;
    const confirmar = window.confirm('Fechar contrato com ' + oferta.empresa + ' por R$ ' + Number(oferta.valor).toLocaleString('pt-BR') + ' na temporada ' + temporadaPatrocinio + '? Esta escolha não poderá ser alterada.');
    if (!confirmar) return;
    setAceitandoPatrocinio(true);
    setMensagemFinancas('');
    const { data, error } = await supabase.rpc('accept_sponsorship_offer', { p_offer_id: oferta.id });
    if (error) setErroFinancas('Não foi possível fechar o patrocínio: ' + error.message);
    else {
      setMensagemFinancas(data?.message || 'Patrocínio contratado.');
      const { data: ofertas } = await supabase.from('sponsorship_offers').select('*').eq('club_id', clubeAtual.id).eq('temporada', temporadaPatrocinio).order('valor', { ascending: false });
      setPropostasPatrocinio(ofertas || []);
      const [{ data: transacoes }, { data: resumo }] = await Promise.all([
        supabase.from('financial_transactions').select('*').eq('club_id', clubeAtual.id).order('created_at', { ascending: false }).limit(100),
        supabase.rpc('get_financial_summary', { p_club_id: clubeAtual.id })
      ]);
      setMovimentacoesFinanceiras(transacoes || []);
      if (resumo) setResumoFinanceiro(resumo);
      const { data: clubesAtualizados } = await supabase.from('clubs').select('*').order('created_at', { ascending: true });
      if (clubesAtualizados) setClubes(clubesAtualizados);
    }
    setAceitandoPatrocinio(false);
  }

  async function registrarLancamentoFinanceiro(event) {
    event.preventDefault();
    if (!clubeAtual?.id || !supabase) return;
    const valor = Number(valorLancamento);
    if (!Number.isFinite(valor) || valor <= 0) {
      setMensagemFinancas('Informe um valor maior que zero.');
      return;
    }
    setSalvandoLancamento(true);
    setMensagemFinancas('');
    const { data, error } = await supabase.rpc('register_financial_transaction', {
      p_tipo: tipoLancamento,
      p_categoria: categoriaLancamento,
      p_descricao: descricaoLancamento.trim(),
      p_valor: valor
    });
    if (error) {
      setMensagemFinancas('Não foi possível registrar: ' + error.message);
    } else {
      setMensagemFinancas(data?.message || 'Lançamento registrado com sucesso.');
      const [clubRes, movRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', clubeAtual.id).single(),
        supabase.from('financial_transactions').select('*').eq('club_id', clubeAtual.id).order('created_at', { ascending: false }).limit(100)
      ]);
      if (!clubRes.error && clubRes.data) setClubes(lista => lista.map(c => c.id === clubRes.data.id ? clubRes.data : c));
      if (!movRes.error) setMovimentacoesFinanceiras(movRes.data || []);
      setDescricaoLancamento('');
      setValorLancamento('');
    }
    setSalvandoLancamento(false);
  }

  async function adicionarJogador(event) {
    event.preventDefault();
    if (!clubeAtual?.id) return;
    setCarregando(true);
    setErroElenco('');
    const { data, error } = await supabase.from('players').insert({
      club_id: clubeAtual.id,
      nome: novoJogador.nome.trim(),
      posicao: novoJogador.posicao,
      data_nascimento: novoJogador.data_nascimento || null,
      overall: Number(novoJogador.overall) || 50,
      potencial: Math.max(60, Number(novoJogador.overall) || 50)
    }).select().single();
    if (error) setErroElenco('Não foi possível adicionar o jogador: ' + error.message);
    else {
      setJogadores(lista => [...lista, data]);
      setNovoJogador({ nome: '', posicao: 'Atacante', data_nascimento: '', overall: 50 });
    }
    setCarregando(false);
  }

  async function removerJogador(id) {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) setErroElenco('Não foi possível remover o jogador: ' + error.message);
    else setJogadores(lista => lista.filter(jogador => jogador.id !== id));
  }

  async function entrar(event) {
    event.preventDefault();
    setCarregando(true);
    setMensagem('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setMensagem(error ? error.message : 'Login realizado.');
    setCarregando(false);
  }

  async function cadastrar(event) {
    event.preventDefault();
    setCarregando(true);
    setMensagem('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } }
    });
    if (error) setMensagem(error.message);
    else if (data.session) setMensagem('Cadastro realizado! Você já está conectado.');
    else setMensagem('Cadastro recebido! Confira seu e-mail para confirmar a conta antes de entrar.');
    setCarregando(false);
  }

  async function recuperarSenha() {
    if (!email) {
      setMensagem('Digite seu e-mail no campo acima para receber o link de recuperação.');
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setMensagem(error ? error.message : 'Se o e-mail estiver cadastrado, você receberá o link de recuperação.');
    setCarregando(false);
  }

  async function iniciarVinculoComClube(clubId, salary = 0) {
    if (!clubId || !supabase) return false;
    setIniciandoCarreira(true);
    setErroClube('');
    const { error } = await supabase.rpc('start_manager_employment', {
      p_club_id: clubId,
      p_salary: salary,
      p_contract_months: 12
    });
    if (error) {
      setErroClube('Não foi possível assumir este clube: ' + error.message);
      setIniciandoCarreira(false);
      return false;
    }
    const { data, error: clubError } = await supabase.from('clubs').select('*').eq('id', clubId).single();
    if (clubError) {
      setErroClube('Vínculo criado, mas não foi possível carregar o clube: ' + clubError.message);
      setIniciandoCarreira(false);
      return false;
    }
    setClubes([data]);
    setClubesDisponiveis([]);
    setMensagem('Carreira iniciada! Você agora comanda ' + data.nome + '.');
    setIniciandoCarreira(false);
    return true;
  }

  async function criarClube(event) {
    event.preventDefault();
    if (!session) return;
    setCarregando(true);
    setErroClube('');
    const { data, error } = await supabase
      .from('clubs')
      .insert({
        owner_id: session.user.id,
        nome: nomeClube.trim(),
        sigla: sigla.trim().toUpperCase(),
        cidade: cidade.trim(),
        estadio: estadio.trim() || null,
        capacidade: 10000,
        pais: 'Brasil',
        orcamento: 5000000
      })
      .select()
      .single();
    if (error) {
      setErroClube('Não foi possível criar o clube: ' + error.message);
    } else {
      const iniciou = await iniciarVinculoComClube(data.id);
      if (iniciou) {
        setMensagem('Clube criado e carreira iniciada com sucesso!');
        setNomeClube('');
        setSigla('');
        setCidade('');
        setEstadio('');
        setCapacidade('10000');
      }
    }
    setCarregando(false);
  }

  const niveisEstadio = [
    { nivel: 2, capacidade: 20000, custo: 500000, dias: 10, nome: 'Ampliação' },
    { nivel: 3, capacidade: 40000, custo: 1500000, dias: 10, nome: 'Estádio moderno' },
    { nivel: 4, capacidade: 70000, custo: 3000000, dias: 10, nome: 'Arena' }
  ];

  async function iniciarAmpliacao() {
    if (!clubeAtual?.id || !supabase || carregandoEstadio) return;
    setCarregandoEstadio(true);
    setMensagemEstadio('');
    try {
      const { data, error } = await supabase.rpc('start_stadium_upgrade', { p_club_id: clubeAtual.id });
      const resultado = Array.isArray(data) ? data[0] : data;

      // Algumas versões da função podem concluir a atualização no banco,
      // mas o PostgREST falhar ao converter o retorno em objeto único.
      if (error) {
        const { data: estado, error: erroConsulta } = await supabase
          .from('clubs')
          .select('id,stadium_target_capacity,stadium_upgrade_started_at,stadium_upgrade_finishes_at,orcamento')
          .eq('id', clubeAtual.id)
          .maybeSingle();

        if (!erroConsulta && estado?.stadium_upgrade_finishes_at) {
          setClubes(lista => lista.map(clube => clube.id === estado.id ? { ...clube, ...estado } : clube));
          setMensagemEstadio('A obra já consta como iniciada no banco. Atualizei o estado do estádio; confira a data de conclusão.');
        } else {
          setMensagemEstadio('Não foi possível iniciar a obra: ' + error.message +
            (erroConsulta ? ' | Também não consegui confirmar o estado do clube: ' + erroConsulta.message : ''));
        }
      } else {
        const { data: atualizado, error: erroClube } = await supabase
          .from('clubs').select('*').eq('id', clubeAtual.id).maybeSingle();
        if (erroClube) {
          setMensagemEstadio('A obra foi solicitada, mas não consegui atualizar a tela: ' + erroClube.message);
        } else if (!atualizado) {
          setMensagemEstadio('A obra foi solicitada, mas o clube não retornou na consulta. Verifique a permissão de leitura do clube.');
        } else {
          setClubes(lista => lista.map(clube => clube.id === atualizado.id ? atualizado : clube));
          setMensagemEstadio('Obra iniciada! Investimento de R$ ' +
            Number(resultado?.cost || 0).toLocaleString('pt-BR') +
            '. Conclusão prevista para ' +
            (resultado?.finishes_at ? new Date(resultado.finishes_at).toLocaleDateString('pt-BR') :
              new Date(atualizado.stadium_upgrade_finishes_at).toLocaleDateString('pt-BR')) + '.');
        }
      }
    } catch (e) {
      setMensagemEstadio('Falha inesperada ao iniciar a obra: ' + (e?.message || String(e)));
    } finally {
      setCarregandoEstadio(false);
    }
  }

  async function salvarPrecoIngresso() {
    if (!clubeAtual?.id || !supabase || salvandoPrecoIngresso) return;
    const valor = Number(precoIngressoInput);
    if (!Number.isFinite(valor) || valor < 10 || valor > 1000) {
      setMensagemFinancas('O preço do ingresso deve ficar entre R$ 10 e R$ 1.000.');
      return;
    }
    setSalvandoPrecoIngresso(true);
    setMensagemFinancas('');
    const { data, error } = await supabase.rpc('set_club_ticket_price', {
      p_club_id: clubeAtual.id,
      p_ticket_price: valor
    });
    if (error) setMensagemFinancas('Não foi possível atualizar o ingresso: ' + error.message);
    else {
      setResumoFinanceiro(resumo => ({ ...resumo, ticket_price: Number(data?.ticket_price || valor) }));
      setMensagemFinancas('Preço do ingresso atualizado com sucesso.');
    }
    setSalvandoPrecoIngresso(false);
  }
  useEffect(() => {
    async function concluirObra() {
      if (!clubeAtual?.id || !clubeAtual.stadium_upgrade_finishes_at || !supabase) return;
      if (new Date(clubeAtual.stadium_upgrade_finishes_at).getTime() > Date.now()) return;
      const proximo = niveisEstadio.find(n => n.capacidade === Number(clubeAtual.stadium_target_capacity));
      if (!proximo) return;
      const { data, error } = await supabase.from('clubs').update({
        capacidade: proximo.capacidade,
        stadium_level: proximo.nivel,
        stadium_target_capacity: null,
        stadium_upgrade_started_at: null,
        stadium_upgrade_finishes_at: null
      }).eq('id', clubeAtual.id).select().single();
      if (!error && data) setClubes(lista => lista.map(clube => clube.id === data.id ? data : clube));
    }
    concluirObra();
  }, [clubeAtual?.id, clubeAtual?.stadium_upgrade_finishes_at]);

  async function responderImprensa(tipo) {
    if (!clubeAtual?.id || !supabase) {
      setRespostaImprensa(tipo);
      setImpactoImprensa('Entre com seu clube conectado para registrar a resposta e atualizar as reputações.');
      return;
    }

    const reputacaoAtual = {
      reputacao_diretoria: Number(clubeAtual.reputacao_diretoria ?? 50),
      reputacao_jogadores: Number(clubeAtual.reputacao_jogadores ?? 50),
      reputacao_torcida: Number(clubeAtual.reputacao_torcida ?? 50)
    };
    const escolhas = {
      elogiar: {
        titulo: 'Elogiar a entrega da equipe',
        fala: '“O resultado é doloroso, mas não vou deixar de reconhecer o esforço dos jogadores. Competimos, tivemos momentos em que controlamos a partida e criamos situações para sair com outro placar. Claro que precisamos melhorar a concentração nos momentos decisivos. Agora é levantar a cabeça, corrigir os detalhes e trabalhar. Não tenho dúvida de que esse grupo pode dar uma resposta.”',
        delta: { reputacao_diretoria: 1, reputacao_jogadores: 4, reputacao_torcida: 2 }
      },
      reconhecer: {
        titulo: 'Reconhecer que o time jogou mal',
        fala: '“Hoje não estivemos no nosso nível. Erramos passes simples, perdemos duelos importantes e demos espaços que um adversário desse nível não costuma desperdiçar. Não adianta procurar desculpas: precisamos jogar mais e melhor. A responsabilidade é de todos, começando por mim, e vamos trabalhar para corrigir isso.”',
        delta: { reputacao_diretoria: 3, reputacao_jogadores: 0, reputacao_torcida: 3 }
      },
      criticar: {
        titulo: 'Criticar duramente a atuação',
        fala: '“Foi uma atuação muito abaixo do que a camisa deste clube exige. Faltou intensidade, concentração e personalidade em momentos importantes. Não podemos entrar em campo esperando que o jogo se resolva sozinho. Vou conversar com o elenco, porque algumas atitudes precisam mudar. Ninguém tem lugar garantido se não corresponder.”',
        delta: { reputacao_diretoria: 2, reputacao_jogadores: -4, reputacao_torcida: 4 }
      },
      proteger: {
        titulo: 'Assumir a responsabilidade e proteger o elenco',
        fala: '“A responsabilidade maior é minha. Sou eu quem prepara a equipe, escolhe a estratégia e toma as decisões. Não vou apontar o dedo para um jogador depois de uma derrota. Temos um grupo trabalhador e vamos resolver nossas questões internamente. Peço ao torcedor que continue apoiando, porque precisamos estar unidos neste momento.”',
        delta: { reputacao_diretoria: 2, reputacao_jogadores: 5, reputacao_torcida: 3 }
      },
      cobrar: {
        titulo: 'Cobrar uma reação imediata',
        fala: '“Não podemos tratar essa derrota como se fosse normal. O torcedor espera entrega e competitividade, e nós temos a obrigação de oferecer isso. A conversa no vestiário será franca. Quero ver mais atitude nos treinamentos e uma resposta dentro de campo já na próxima rodada. O discurso precisa virar resultado.”',
        delta: { reputacao_diretoria: 4, reputacao_jogadores: -2, reputacao_torcida: 4 }
      }
    };
    const escolha = escolhas[tipo];
    if (!escolha) return;
    const atualizadas = {
      reputacao_diretoria: Math.max(0, Math.min(100, reputacaoAtual.reputacao_diretoria + escolha.delta.reputacao_diretoria)),
      reputacao_jogadores: Math.max(0, Math.min(100, reputacaoAtual.reputacao_jogadores + escolha.delta.reputacao_jogadores)),
      reputacao_torcida: Math.max(0, Math.min(100, reputacaoAtual.reputacao_torcida + escolha.delta.reputacao_torcida))
    };
    const { data, error } = await supabase.from('clubs').update(atualizadas).eq('id', clubeAtual.id).select().single();
    if (error) {
      setRespostaImprensa(escolha.titulo);
      setImpactoImprensa(escolha.fala + ' (A declaração foi exibida, mas as reputações não foram salvas. Verifique se a atualização SQL foi executada.)');
      return;
    }
    setClubes(lista => lista.map(clube => clube.id === data.id ? data : clube));
    setRespostaImprensa(escolha.titulo);
    setImpactoImprensa(escolha.fala);
  }

  async function sair() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setDemo(false);
    setClubes([]);
  }

  const autenticado = Boolean(session || demo);

  if (supabaseConfigured && !session) {
    return (
      <main style={styles.page}>
        <section style={styles.authCard}>
          <img src="/Futmanagerbr-logo.png" alt="Futmanagerbr — Monte seu time. Faça história." style={{display:"block",width:"min(260px, 75vw)",height:"auto",maxHeight:260,objectFit:"contain",margin:"0 auto 12px"}} />
          <p style={styles.muted}>Entre para administrar seu clube e disputar campeonatos.</p>
          <div style={styles.tabs}>
            <button style={modo === 'login' ? styles.activeTab : styles.tab} onClick={() => {setModo('login'); setMensagem('');}}>Entrar</button>
            <button style={modo === 'cadastro' ? styles.activeTab : styles.tab} onClick={() => {setModo('cadastro'); setMensagem('');}}>Criar conta</button>
          </div>
          <form onSubmit={modo === 'login' ? entrar : cadastrar} style={{display:'grid', gap:12}}>
            {modo === 'cadastro' && <input style={styles.input} placeholder="Nome do treinador" value={nome} onChange={e => setNome(e.target.value)} required />}
            <input style={styles.input} type="email" placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} required />
            <input style={styles.input} type="password" placeholder="Senha (mínimo 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} minLength={6} required />
            <button style={styles.primary} disabled={carregando}>{carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar no jogo' : 'Criar minha conta'}</button>
          </form>
          {modo === 'login' && <button style={styles.link} onClick={recuperarSenha} disabled={carregando}>Esqueci minha senha</button>}
          {mensagem && <p style={styles.notice}>{mensagem}</p>}
          <p style={styles.mutedSmall}>Sua conta é protegida pelo Supabase Auth.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mfo-app" style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>⚽ Manager Futebol Online</h1>
          <p style={styles.muted}>Gestão de clube • Painel da temporada</p>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          {session && <span style={styles.user}>{session.user.email}</span>}
          {demo && <span style={styles.user}>Modo demonstração</span>}
          {autenticado && <button style={styles.secondary} onClick={sair}>Sair</button>}
        </div>
      </header>
      {!supabaseConfigured && !demo && (
        <section style={styles.noticeBox}>
          <strong>Autenticação ainda não configurada</strong>
          <p>O painel está disponível em demonstração. Para ativar contas reais, configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no Cloudflare Pages.</p>
          <button style={styles.primary} onClick={() => setDemo(true)}>Acessar demonstração</button>
        </section>
      )}
      {session && carregandoClubes ? (
        <section style={styles.panel}><p>Carregando seus clubes...</p></section>
      ) : session && !clubeAtual ? (
        <section style={styles.panel}>
          <span style={styles.eyebrow}>MERCADO DE TREINADORES • INÍCIO DE CARREIRA</span>
          <h2>Escolha seu primeiro desafio</h2>
          <p style={styles.muted}>Você pode assumir um clube existente do universo do MFO ou começar do zero criando sua própria equipe. Cada treinador comanda apenas um clube por vez.</p>
          <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:18,marginTop:18}}>
            <h3>Assumir um clube existente</h3>
            <label style={styles.filterLabel}>Clube disponível
              <select style={styles.input} value={clubeSelecionado} onChange={e => setClubeSelecionado(e.target.value)}>
                {clubesDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome} • {c.pais || 'País não informado'}{c.is_ai ? ' • IA' : ' • Meu clube'}</option>)}
              </select>
            </label>
            <button style={{...styles.primary,marginTop:12}} disabled={!clubeSelecionado || iniciandoCarreira} onClick={() => iniciarVinculoComClube(clubeSelecionado)}>
              {iniciandoCarreira ? 'Assumindo clube...' : 'Assumir este clube'}
            </button>
            <p style={styles.mutedSmall}>Os clubes da IA mantêm seu cadastro original. Sua carreira registra apenas o vínculo profissional.</p>
          </div>
          <div style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:18,marginTop:16}}>
            <h3>Criar um clube do zero</h3>
            <p style={styles.muted}>Comece com estádio de 10 mil lugares e orçamento inicial de R$ 5 milhões.</p>
            <form onSubmit={criarClube} style={styles.formGrid}>
              <label>Nome do clube<input style={styles.input} value={nomeClube} onChange={e => setNomeClube(e.target.value)} placeholder="Ex.: União Caçapavense" required /></label>
              <label>Sigla<input style={styles.input} value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Ex.: UCA" maxLength={5} required /></label>
              <label>Cidade<input style={styles.input} value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade" required /></label>
              <label>Estádio<input style={styles.input} value={estadio} onChange={e => setEstadio(e.target.value)} placeholder="Nome do estádio" /></label>
              <label>Capacidade inicial<input style={styles.input} type="number" value="10000" readOnly /></label>
              <button style={styles.primary} disabled={carregando || iniciandoCarreira}>{carregando ? 'Salvando...' : 'Criar clube e iniciar carreira'}</button>
            </form>
          </div>
          {erroClube && <p style={styles.error}>{erroClube}</p>}
          {mensagem && <p style={styles.notice}>{mensagem}</p>}
        </section>
      ) : (
        <>
          {clubeAtual && aba !== 'Início' && <section className="mfo-club-bar" style={styles.club}>
            <div>
              <span style={styles.eyebrow}>SEU CLUBE</span>
              <h2>{clubeAtual.nome}</h2>
              <p style={styles.muted}>{clubeAtual.cidade} • {clubeAtual.pais}</p>
              <p style={styles.muted}>Estádio: {clubeAtual.estadio || 'A definir'} • Capacidade: {Number(clubeAtual.capacidade).toLocaleString('pt-BR')}</p>
            </div>
            <div style={styles.clubBadge}>{clubeAtual.sigla || 'MFO'}</div>
          </section>}
          <div className="mfo-workspace">
          <button className="mfo-menu-toggle" onClick={() => setMenuAberto(value => !value)} aria-expanded={menuAberto} aria-label="Abrir ou recolher menu"><span>☰</span> Menu do jogo <span className="mfo-menu-chevron">{menuAberto ? '−' : '+'}</span></button>
          <nav className={`mfo-sidebar ${menuAberto ? 'is-open' : ''}`} aria-label="Menu principal do jogo">
            <span className="mfo-nav-label">MENU PRINCIPAL</span>
            {[
              ['Visão Geral','Início','⌂'],['Elenco','Elenco','♟'],['Escalação','Táticas','⚽'],
              ['Partidas','Partidas','◷'],['Competições','Competições','🏆'],['Amistosos Online','Amistosos','⚔'],['Finanças','Finanças','＄']
            ].map(([label,value,icon]) => <button key={value} className={`mfo-nav-btn ${aba === value || (value === 'Competições' && aba === 'Liga') ? 'is-active' : ''}`} aria-current={aba === value ? 'page' : undefined} onClick={() => {setAba(value);setMenuAberto(false);}}><span className="mfo-nav-dot">{icon}</span>{label}</button>)}
            <div className="mfo-nav-sep" />
            <button className="mfo-nav-btn mfo-more-toggle" onClick={() => setMaisModulosAbertos(value => !value)}><span className="mfo-nav-dot">＋</span>Outros módulos <span className="mfo-menu-chevron">{maisModulosAbertos ? '−' : '+'}</span></button>
            {maisModulosAbertos && [['Mercado','Mercado','⇄'],['Base','Academia','♙'],['Estádio','Estádio','▦'],['Imprensa','Imprensa','▤'],['Rankings','Rankings','★']].map(([value,label,icon]) => <button key={value} className={`mfo-nav-btn ${aba === value ? 'is-active' : ''}`} aria-current={aba === value ? 'page' : undefined} onClick={() => {setAba(value);setMenuAberto(false);}}><span className="mfo-nav-dot">{icon}</span>{label}</button>)}
            <div className="mfo-sidebar-foot">MANAGER<br/>FUTEBOL ONLINE</div>
          </nav>
          <section className="mfo-content">
            <h2>{aba === 'Início' ? 'Visão Geral' : aba === 'Táticas' ? 'Escalação' : aba}</h2>
            {aba === 'Início' ? <DashboardModule supabase={supabase} club={clubeAtual} onNavigate={setAba} /> :
              aba === 'Elenco' ? <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <p style={styles.muted}>Gerencie seu grupo profissional, acompanhe os contratos e organize os jogadores do clube.</p>
                    <span style={styles.mutedSmall}>Apresentação em cartões • dados e negociações mantidos no sistema atual</span>
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <span style={{background:'#112a1c',border:'1px solid #1f4a31',padding:'9px 12px',borderRadius:9,fontSize:13}}><strong>{jogadores.length}</strong> atletas</span>
                    <span style={{background:'#112a1c',border:'1px solid #1f4a31',padding:'9px 12px',borderRadius:9,fontSize:13}}><strong>{jogadores.filter(j=>j.is_star).length}</strong> estrelas ★</span>
                  </div>
                </div>
                {erroElenco && <p style={styles.error}>{erroElenco}</p>}
                {mensagemElenco && <p style={styles.notice}>{mensagemElenco}</p>}
                {carregandoJogadores ? <p style={styles.muted}>Carregando elenco...</p> : jogadores.length === 0 ? <div style={{background:'#0a1a12',border:'1px dashed #1f4a31',borderRadius:12,padding:24,marginTop:18}}>
                  <h3 style={{marginTop:0}}>Elenco vazio</h3>
                  <p style={styles.muted}>Você ainda não tem jogadores. Acesse a área Mercado para montar seu primeiro elenco.</p>
                  <button style={styles.primary} onClick={() => setAba('Mercado')}>Ir para o Mercado</button>
                </div> : <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:14,marginTop:18}}>
                    <label style={styles.filterLabel}>Buscar jogador
                      <input style={styles.input} value={buscaElenco} onChange={e=>setBuscaElenco(e.target.value)} placeholder="Digite o nome do atleta"/>
                    </label>
                    <label style={styles.filterLabel}>Filtrar por posição
                      <select style={styles.input} value={posicaoElenco} onChange={e=>setPosicaoElenco(e.target.value)}>
                        {['Todas','Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </label>
                    <div style={{display:'flex',alignItems:'end'}}>
                      <button style={styles.secondary} onClick={()=>{setBuscaElenco('');setPosicaoElenco('Todas');}}>Limpar filtros</button>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',margin:'16px 0 10px'}}>
                    <strong>{jogadores.filter(j=>(!buscaElenco || (j.nome||'').toLocaleLowerCase('pt-BR').includes(buscaElenco.toLocaleLowerCase('pt-BR')))&&(posicaoElenco==='Todas'||j.posicao===posicaoElenco)).length} jogador(es) exibido(s)</strong>
                    <span style={styles.mutedSmall}>Overall • contrato • disponibilidade</span>
                  </div>
                  {jogadores.filter(j=>(!buscaElenco || (j.nome||'').toLocaleLowerCase('pt-BR').includes(buscaElenco.toLocaleLowerCase('pt-BR')))&&(posicaoElenco==='Todas'||j.posicao===posicaoElenco)).length===0
                    ? <p style={styles.muted}>Nenhum atleta corresponde aos filtros selecionados.</p>
                    : <div className="mfo-roster-wrap"><table className="mfo-roster-table">
                      <thead><tr><th>Jogador</th><th>Pos.</th><th>Idade</th><th>OVR</th><th>POT</th><th>Contrato</th><th>Valor de mercado</th><th>Situação</th><th>Ações</th></tr></thead>
                      <tbody>
                      {jogadores.filter(j=>(!buscaElenco || (j.nome||'').toLocaleLowerCase('pt-BR').includes(buscaElenco.toLocaleLowerCase('pt-BR')))&&(posicaoElenco==='Todas'||j.posicao===posicaoElenco)).map(j=>{
                        const idade=idadeJogador(j.data_nascimento);
                        const status=j.disponivel_transferencia?'À venda':j.disponivel_emprestimo?'Para empréstimo':'No elenco';
                        const tagClasse=j.disponivel_transferencia?'sale':j.disponivel_emprestimo?'loan':'ok';
                        const iniciais=(j.nome||'Jogador').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
                        return <tr key={j.id}>
                          <td><div className="mfo-pl"><div className="mfo-pl-avatar">{iniciais}</div><div><span className="mfo-pl-name">{j.nome}{j.is_star&&<span style={{color:'#facc15',marginLeft:5}}>★</span>}</span><span className="mfo-pl-sub">{j.nacionalidade||'Nacionalidade não informada'}</span></div></div></td>
                          <td>{j.posicao||'—'}</td>
                          <td>{idade?idade:'—'}</td>
                          <td><span className={`mfo-ovr ${Number(j.overall)>=80?'is-high':''}`}>{j.overall??'-'}</span></td>
                          <td className="mfo-pot">{j.potencial??'-'}</td>
                          <td>{j.contrato_ate?new Date(j.contrato_ate+'T12:00:00').toLocaleDateString('pt-BR'):'Sem prazo'}{j.status_contrato==='livre'&&<span className="mfo-pl-sub">Sem contrato</span>}</td>
                          <td>R$ {Number(j.valor_mercado||0).toLocaleString('pt-BR')}</td>
                          <td><span className={`mfo-tag ${tagClasse}`}>{status}</span></td>
                          <td><div className="mfo-roster-actions">
                            <button style={styles.secondary} onClick={()=>alterarDisponibilidadeJogador(j,'venda')}>{j.disponivel_transferencia?'Retirar venda':'Vender'}</button>
                            <button style={styles.secondary} onClick={()=>alterarDisponibilidadeJogador(j,'emprestimo')}>{j.disponivel_emprestimo?'Retirar empréstimo':'Emprestar'}</button>
                            <button style={styles.primary} onClick={()=>renovarContrato(j)}>Renovar</button>
                          </div></td>
                        </tr>;
                      })}
                      </tbody>
                    </table></div>}
                </>}
              </div> :
              aba === 'Mercado' ? <div>
                <p style={styles.muted}>Encontre jogadores cadastrados no banco de dados do MFO. Use os filtros para montar seu elenco.</p>
                {erroMercado && <p style={styles.error}>{erroMercado}</p>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:16,marginTop:16}}>
                  <label style={styles.filterLabel}>Posição<select style={styles.input} value={filtroPosicao} onChange={e=>setFiltroPosicao(e.target.value)}>{['Todas','Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'].map(x=><option key={x}>{x}</option>)}</select></label>
                  <label style={styles.filterLabel}>Clube<select style={styles.input} value={filtroClube} onChange={e=>{setFiltroClube(e.target.value);setFiltroNacionalidade('Todas');}}><option value="Todos">Todos os clubes</option>{clubesDisponiveisNoFiltro.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
                  <label style={styles.filterLabel}>Liga<select style={styles.input} value={filtroLiga} onChange={e=>{setFiltroLiga(e.target.value);setFiltroClube('Todos');setFiltroNacionalidade('Todas');}}><option value="Todas">Todas as ligas</option>{ligasMercado.map(x=><option key={x.id} value={x.id}>{x.nome} • {x.pais} • {x.divisao}</option>)}</select></label>
                  <label style={styles.filterLabel}>Nacionalidade<select style={styles.input} value={filtroNacionalidade} onChange={e=>setFiltroNacionalidade(e.target.value)}><option value="Todas">Todas</option>{nacionalidadesDisponiveis.map(x=><option key={x}>{x}</option>)}</select></label>
                  <label style={styles.filterLabel}>Disponibilidade<select style={styles.input} value={filtroDisponibilidade} onChange={e=>setFiltroDisponibilidade(e.target.value)}><option value="todos">Todas</option><option value="transferencia">À venda</option><option value="emprestimo">Empréstimo</option><option value="livre">Sem contrato</option></select></label>
                  <label style={styles.filterLabel}>Faixa de Overall
                    <select style={styles.input} value={faixaOverall} onChange={e=>{const faixa=e.target.value;setFaixaOverall(faixa);const limites={todos:['0','100'],'10-30':['10','30'],'31-50':['31','50'],'51-75':['51','75'],'76-99':['76','99']};setOverallMin(limites[faixa][0]);setOverallMax(limites[faixa][1]);}}>
                      <option value="todos">Todos os níveis</option>
                      <option value="10-30">10 a 30</option>
                      <option value="31-50">31 a 50</option>
                      <option value="51-75">51 a 75</option>
                      <option value="76-99">76 a 99</option>
                    </select>
                  </label>
                  <label style={styles.filterLabel}>Valor mínimo (R$)<input style={styles.input} type="number" min="0" value={valorMin} onChange={e=>setValorMin(e.target.value)} /></label>
                  <label style={styles.filterLabel}>Valor máximo (R$)<input style={styles.input} type="number" min="0" value={valorMax} onChange={e=>setValorMax(e.target.value)} /></label>
                </div>
                {mensagemOferta && <p style={styles.notice}>{mensagemOferta}</p>}
                {jogadorOferta && <form onSubmit={enviarProposta} style={{background:'#112a1c',border:'1px solid #67e8a5',borderRadius:12,padding:18,marginTop:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <div><span style={styles.eyebrow}>NOVA NEGOCIAÇÃO</span><h3 style={{margin:'8px 0'}}>{jogadorOferta.nome}</h3><p style={styles.mutedSmall}>Overall {jogadorOferta.overall} • Valor de mercado: R$ {Number(jogadorOferta.valor_mercado || 0).toLocaleString('pt-BR')}</p></div>
                    <button type="button" style={styles.secondary} onClick={()=>setJogadorOferta(null)}>Cancelar</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:12}}>
                    <label style={styles.filterLabel}>Tipo de negociação
                      <select style={styles.input} value={tipoOferta} onChange={e=>{const tipo=e.target.value;setTipoOferta(tipo);const base=Number(jogadorOferta.valor_mercado||0);setValorOferta(tipo==='emprestimo'?String(Math.max(1,Math.round(base*0.02))):String(jogadorOferta.status_contrato==='livre'?0:Math.round(base)));}}>
                        {jogadorOferta.status_contrato==='livre' && <option value="compra">Contratação livre</option>}
                        {jogadorOferta.status_contrato!=='livre' && jogadorOferta.disponivel_transferencia && <option value="compra">Compra definitiva</option>}
                        {jogadorOferta.status_contrato!=='livre' && jogadorOferta.disponivel_emprestimo && <option value="emprestimo">Empréstimo</option>}
                      </select>
                    </label>
                    {jogadorOferta.status_contrato!=='livre' && <label style={styles.filterLabel}>Valor da proposta (R$)
                      <input style={styles.input} type="number" min="0" value={valorOferta} onChange={e=>setValorOferta(e.target.value)} required />
                    </label>}
                    {tipoOferta==='emprestimo' && <label style={styles.filterLabel}>Duração do empréstimo
                      <select style={styles.input} value={mesesOferta} onChange={e=>setMesesOferta(e.target.value)}>{[3,6,9,12,18,24].map(n=><option key={n} value={n}>{n} meses</option>)}</select>
                    </label>}
                    <label style={styles.filterLabel}>Salário mensal oferecido (R$)
                      <input style={styles.input} type="number" min="1" step="1" value={salarioOferta} onChange={e=>setSalarioOferta(e.target.value)} required />
                    </label>
                  </div>
                  <p style={styles.mutedSmall}>Exigência salarial estimada deste jogador: R$ {salarioSugerido.toLocaleString('pt-BR')} por mês. O valor aumenta conforme o Overall e recebe adicional para jogadores estrela. Se a proposta for baixa, o jogador apresentará uma contraproposta.</p>
                  <p style={styles.mutedSmall}>{jogadorOferta.status_contrato==='livre'?'Não há taxa de transferência.':tipoOferta==='compra'?'O clube vendedor aceita propostas a partir de 85% do valor de mercado.': 'O clube vendedor avalia propostas de empréstimo a partir de 2% do valor de mercado.'}</p>
                  <button style={styles.primary} disabled={enviandoOferta}>{enviandoOferta?'Processando negociação...':'Enviar proposta'}</button>
                </form>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginTop:16}}>
                  <strong>{carregandoMercado ? 'Buscando jogadores...' : jogadoresFiltrados.length + ' jogador(es) encontrado(s)'}</strong>
                  <button style={styles.secondary} onClick={()=>{setFiltroPosicao('Todas');setFiltroClube('Todos');setFiltroLiga('Todas');setFiltroNacionalidade('Todas');setFiltroDisponibilidade('todos');setOverallMin('0');setOverallMax('100');setFaixaOverall('todos');setValorMin('0');setValorMax('100000000');}}>Limpar filtros</button>
                </div>
                {!carregandoMercado && jogadoresFiltrados.length === 0 ? <div style={{background:'#0a1a12',border:'1px dashed #1f4a31',borderRadius:12,padding:22,marginTop:14}}><h3 style={{marginTop:0}}>Nenhum jogador encontrado</h3><p style={styles.muted}>O catálogo ainda está vazio ou não há jogadores com esses critérios. Os jogadores aparecerão aqui quando forem cadastrados no mercado.</p></div> :
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,marginTop:14}}>
                  {jogadoresFiltrados.map(j=>{const clube=clubesMercado.find(x=>x.id===j.club_id);const status=j.status_contrato==='livre'?'Sem contrato':j.disponivel_emprestimo?'Disponível para empréstimo':j.disponivel_transferencia?'À venda':'No elenco';return <article key={j.id} style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'start'}}><div><strong>{j.nome}</strong><p style={styles.mutedSmall}>{j.posicao || 'Posição não informada'} • {j.nacionalidade || 'Nacionalidade não informada'}</p></div><span style={{background:'#168653',padding:'6px 9px',borderRadius:8,fontWeight:'bold'}}>OVR {j.overall ?? '-'}</span></div>
                    <p style={styles.muted}>Clube: {clube?.nome || (j.status_contrato==='livre'?'Jogador livre':'Clube não identificado')}</p><p style={styles.muted}>Valor: R$ {Number(j.valor_mercado || 0).toLocaleString('pt-BR')}</p><p style={{color:'#67e8a5',fontSize:13}}>{status}</p>{j.is_star && <span style={styles.eyebrow}>★ JOGADOR ESTRELA</span>}
                    {j.status_contrato==='livre' || j.disponivel_transferencia || j.disponivel_emprestimo ? <button style={{...styles.primary,width:'100%',marginTop:12}} onClick={()=>{setJogadorOferta(j);setTipoOferta(j.status_contrato==='livre'||j.disponivel_transferencia?'compra':'emprestimo');setValorOferta(j.status_contrato==='livre'?'0':String(Math.round(Number(j.valor_mercado||0)*(j.disponivel_transferencia?1:0.02))));setSalarioOferta(String(Math.round(3000*Math.pow(Math.max(40,Math.min(100,Number(j.overall||50)))/50,3.6)*(j.is_star?1.25:1))));setMensagemOferta('');}}>Negociar jogador</button> : <p style={styles.mutedSmall}>Não disponível para negociação.</p>}
                  </article>;})}
                </div>}
                <p style={styles.mutedSmall}>As propostas são processadas pelo banco de dados. Contratações livres não têm taxa; compras e empréstimos verificam disponibilidade e orçamento. Empréstimos vencidos retornam ao clube de origem quando o mercado é carregado.</p>
              </div> :
              aba === 'Finanças' ? <div>
                <p style={styles.muted}>Acompanhe o caixa, as receitas e despesas automáticas, o patrocínio e a movimentação do clube.</p>
                {erroFinancas && <p style={styles.error}>{erroFinancas}</p>}
                <section style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:18,marginTop:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <div><span style={styles.eyebrow}>PATROCÍNIO OFICIAL</span><h3 style={{margin:'8px 0'}}>Temporada {temporadaPatrocinio}</h3></div>
                    {propostasPatrocinio.some(p=>p.status==='aceito') && <span style={{background:'#168653',padding:'7px 10px',borderRadius:8,fontWeight:700}}>CONTRATO FECHADO</span>}
                  </div>
                  {propostasPatrocinio.some(p=>p.status==='aceito')
                    ? <p style={styles.muted}>Patrocinador escolhido: <strong>{propostasPatrocinio.find(p=>p.status==='aceito')?.empresa}</strong>. Contrato travado até o encerramento desta temporada. O valor já foi creditado ao caixa.</p>
                    : <><p style={styles.muted}>Três empresas prepararam propostas para seu clube. Escolha uma; o contrato ficará bloqueado até a próxima temporada.</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:14}}>
                        {propostasPatrocinio.map(p=><article key={p.id} style={{background:'#112a1c',border:'1px solid #1f4a31',borderRadius:10,padding:15}}>
                          <strong>{p.empresa}</strong>
                          <h3 style={{color:'#67e8a5',fontSize:22,margin:'12px 0'}}>R$ {Number(p.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</h3>
                          <p style={styles.mutedSmall}>Valor total do patrocínio nesta temporada.</p>
                          <button style={{...styles.primary,width:'100%',marginTop:10}} disabled={aceitandoPatrocinio || p.status!=='ofertado'} onClick={()=>aceitarPatrocinio(p)}>{aceitandoPatrocinio?'Fechando contrato...':'Escolher empresa'}</button>
                        </article>)}
                      </div>
                    </>}
                  {mensagemFinancas && <p style={styles.notice}>{mensagemFinancas}</p>}
                </section>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:16}}>
                  <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:18}}><span style={styles.eyebrow}>SALDO DISPONÍVEL</span><h3 style={{fontSize:25,color:'#67e8a5',margin:'10px 0'}}>R$ {Number(clubeAtual?.orcamento || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</h3><p style={styles.mutedSmall}>Caixa atual do clube</p></div>
                  <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:18}}><span style={styles.eyebrow}>RECEITAS REGISTRADAS</span><h3 style={{fontSize:23,color:'#67e8a5',margin:'10px 0'}}>R$ {receitasFinanceiras.toLocaleString('pt-BR',{minimumFractionDigits:2})}</h3><p style={styles.mutedSmall}>Total de {Number(resumoFinanceiro.total_movimentacoes || 0).toLocaleString('pt-BR')} movimentações</p></div>
                  <div style={{background:'#0a1a12',border:'1px solid #6b3b45',borderRadius:12,padding:18}}><span style={{...styles.eyebrow,color:'#fca5a5'}}>DESPESAS REGISTRADAS</span><h3 style={{fontSize:23,color:'#fca5a5',margin:'10px 0'}}>R$ {despesasFinanceiras.toLocaleString('pt-BR',{minimumFractionDigits:2})}</h3><p style={styles.mutedSmall}>Total de {Number(resumoFinanceiro.total_movimentacoes || 0).toLocaleString('pt-BR')} movimentações</p></div>
                </div>
                <section style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:18,marginTop:16}}>
                  <span style={styles.eyebrow}>BILHETERIA</span>
                  <h3 style={{margin:'8px 0'}}>Preço do ingresso</h3>
                  <p style={styles.mutedSmall}>A arrecadação será calculada automaticamente conforme capacidade do estádio, força do elenco, fase do clube e público estimado.</p>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:12}}>
                    <span>R$</span><input type="number" min="10" max="1000" step="1" value={precoIngressoInput} onChange={e=>setPrecoIngressoInput(e.target.value)} style={{...styles.input,maxWidth:160,marginTop:0}} />
                    <button style={styles.primary} onClick={salvarPrecoIngresso} disabled={salvandoPrecoIngresso}>{salvandoPrecoIngresso?'Salvando...':'Salvar preço'}</button>
                  </div>
                </section>
                <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16,marginTop:20}}>

                  <div style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:18}}>
                    <span style={styles.eyebrow}>VISÃO FINANCEIRA</span><h3>Resumo do clube</h3>
                    <p style={styles.muted}>Resultado acumulado de todas as movimentações: <strong style={{color:receitasFinanceiras-despesasFinanceiras>=0?'#67e8a5':'#fca5a5'}}>R$ {(receitasFinanceiras-despesasFinanceiras).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></p>
                    <p style={styles.muted}>Orçamento disponível: <strong>R$ {Number(clubeAtual?.orcamento || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></p>
                    <p style={styles.mutedSmall}>Os totais consideram todo o histórico financeiro. A tabela abaixo exibe as 100 movimentações mais recentes.</p>
                  </div>
                </div>
                <div style={{marginTop:22}}>
                  <h3>Histórico de movimentações</h3>
                  {carregandoFinancas ? <p style={styles.muted}>Carregando movimentações...</p> : movimentacoesFinanceiras.length===0 ? <p style={styles.muted}>Nenhuma movimentação registrada ainda. As receitas e despesas aparecerão aqui quando forem geradas pelo jogo.</p> : <div style={{overflowX:'auto'}}><table style={styles.table}><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>
                    {movimentacoesFinanceiras.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td><td style={{color:m.tipo==='receita'?'#67e8a5':'#fca5a5'}}>{m.tipo==='receita'?'Entrada':'Saída'}</td><td>{m.categoria}</td><td>{m.descricao || '-'}</td><td style={{whiteSpace:'nowrap'}}>R$ {Number(m.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>)}
                  </tbody></table></div>}
                </div>
              </div> :
              aba === 'Imprensa' ? <div>
                <p style={styles.muted}>Central de imprensa do clube. Responda às entrevistas após clássicos, semifinais, finais, decisões importantes e partidas marcantes.</p>
                <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:20,marginTop:16}}>
                  <span style={styles.eyebrow}>ENTREVISTA PÓS-JOGO</span>
                  <h3 style={{marginTop:10}}>O que achou da derrota da equipe?</h3>
                  <p style={styles.muted}>Como treinador, escolha exatamente o que você diria aos jornalistas. Cada declaração terá consequências diferentes para a relação com diretoria, jogadores e torcida.</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12,marginTop:16}}>
                    {Object.entries({
                      reconhecer: '“Hoje não estivemos no nosso nível. Erramos passes simples, perdemos duelos importantes e demos espaços que um adversário desse nível não costuma desperdiçar. Não adianta procurar desculpas: precisamos jogar mais e melhor. A responsabilidade é de todos, começando por mim, e vamos trabalhar para corrigir isso.”',
                      proteger: '“A responsabilidade maior é minha. Sou eu quem prepara a equipe, escolhe a estratégia e toma as decisões. Não vou apontar o dedo para um jogador depois de uma derrota. Temos um grupo trabalhador e vamos resolver nossas questões internamente. Peço ao torcedor que continue apoiando, porque precisamos estar unidos neste momento.”',
                      cobrar: '“Não podemos tratar essa derrota como se fosse normal. O torcedor espera entrega e competitividade, e nós temos a obrigação de oferecer isso. A conversa no vestiário será franca. Quero ver mais atitude nos treinamentos e uma resposta dentro de campo já na próxima rodada. O discurso precisa virar resultado.”'
                    }).map(([tipo, fala]) => (
                      <button key={tipo} style={{...styles.secondary,textAlign:'left',lineHeight:1.7,padding:16,fontSize:14}} onClick={() => responderImprensa(tipo)}>{fala}</button>
                    ))}
                  </div>
                </div>
                {respostaImprensa && <div style={{background:'#112a1c',border:'1px solid #1f4a31',borderRadius:12,padding:18,marginTop:16}}>
                  <span style={styles.eyebrow}>DECLARAÇÃO À IMPRENSA</span>
                  <h3>{respostaImprensa}</h3>
                  <p style={{color:"#e3f3e8",fontSize:15,lineHeight:1.8,marginTop:12}}>{impactoImprensa}</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:16}}>
                    <div style={{background:'#0a1a12',borderRadius:9,padding:12}}><strong>Diretoria</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_diretoria ?? 50)}/100</div></div>
                    <div style={{background:'#0a1a12',borderRadius:9,padding:12}}><strong>Jogadores</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_jogadores ?? 50)}/100</div></div>
                    <div style={{background:'#0a1a12',borderRadius:9,padding:12}}><strong>Torcida</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_torcida ?? 50)}/100</div></div>
                  </div>
                  <button style={styles.secondary} onClick={() => {setRespostaImprensa('');setImpactoImprensa(null);}}>Nova entrevista</button>
                </div>}
                <p style={styles.mutedSmall}>As reputações são registradas no clube e variam conforme sua declaração. Nesta etapa, os efeitos ainda não são calculados automaticamente pelo resultado real da partida.</p>
              </div> :
              aba === 'Amistosos' ? <MultiplayerLobby supabase={supabase} user={session?.user} club={clubeAtual} /> :
              aba === 'Rankings' ? <RankingsModule supabase={supabase} clubeAtual={clubeAtual} /> :
              aba === 'Base' ? <div>
                <p style={styles.muted}>Revele e desenvolva talentos nas três categorias: Sub-15 (14 e 15 anos), Sub-17 (16 e 17 anos) e Sub-20 (18 a 20 anos). Os jovens ficam separados do elenco profissional até a promoção, liberada a partir dos 18 anos.</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:16}}>
                  <div style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>JOVENS NA BASE</span><h3 style={{fontSize:26,margin:'8px 0'}}>{jogadoresBase.length}</h3><p style={styles.mutedSmall}>Atletas contratados</p>
                  </div>
                  <div style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>JOVENS ESTRELAS</span><h3 style={{fontSize:26,margin:'8px 0',color:'#facc15'}}>{jogadoresBase.filter(j=>j.is_star).length} ★</h3><p style={styles.mutedSmall}>Talentos especiais</p>
                  </div>
                  <div style={{background:'#0a1a12',border:'1px solid #1f4a31',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>CANDIDATOS</span><h3 style={{fontSize:26,margin:'8px 0'}}>{candidatosBase.length}</h3><p style={styles.mutedSmall}>Aguardando avaliação</p>
                  </div>
                </div>
                <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:18,marginTop:18}}>
                  <span style={styles.eyebrow}>CAPTAÇÃO DE TALENTOS</span>
                  <h3 style={{margin:'8px 0'}}>Peneira de novos jogadores</h3>
                  <p style={styles.muted}>Cada peneira apresenta 5 jovens de 14 a 20 anos, distribuídos entre Sub-15, Sub-17 e Sub-20. A maioria terá overall entre 35 e 52; talentos especiais são raros e podem ter potencial superior.</p>
                  <p style={styles.muted}>Temporada {temporadaBase}: <strong>{peneirasTemporada} de 2 peneiras utilizadas</strong>.</p>
                  <button style={styles.primary} onClick={abrirPeneira} disabled={gerandoPeneira || carregandoBase || peneirasTemporada >= 2}>{gerandoPeneira?'Avaliando candidatos...':peneirasTemporada >= 2?'Limite de peneiras atingido':'⚽ Abrir peneira • 5 candidatos'}</button>
                </div>
                <div style={{background:'#0b1220',border:'1px solid #285b49',borderRadius:12,padding:18,marginTop:14}}>
                  <span style={styles.eyebrow}>DESENVOLVIMENTO SEMANAL</span>
                  <h3 style={{margin:'8px 0'}}>Treinamento gradual</h3>
                  <p style={styles.muted}>Uma sessão por clube a cada semana. Jogadores mais jovens tendem a evoluir com maior frequência; o crescimento diminui com a idade e nunca ultrapassa o potencial individual.</p>
                  <p style={styles.mutedSmall}>{ultimoTreinoBase ? 'Último treino: ' + new Date(ultimoTreinoBase.trained_at).toLocaleString('pt-BR') + ' • ' + Number(ultimoTreinoBase.points_added || 0) + ' ponto(s) de evolução.' : 'Nenhum treino semanal registrado para este clube.'}</p>
                  <button style={styles.primary} onClick={treinarBase} disabled={treinandoBase || carregandoBase}>{treinandoBase ? 'Treinando categoria de base...' : '🏃 Treinar base desta semana'}</button>
                </div>
                {erroBase && <p style={styles.error}>{erroBase}</p>}
                {mensagemBase && <p style={styles.notice}>{mensagemBase}</p>}
                {carregandoBase ? <p style={styles.muted}>Carregando categoria de base...</p> : <>
                  {candidatosBase.length>0 && <div style={{marginTop:22}}>
                    <h3>Candidatos da peneira</h3>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12}}>
                      {candidatosBase.map(c=><div key={c.id} style={{background:'#112a1c',border:'1px solid #1f4a31',borderRadius:12,padding:15}}>
                        <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
                          <strong>{c.nome}</strong>{c.is_star&&<span style={{color:'#facc15'}}>★ TALENTO</span>}
                        </div>
                        <p style={styles.muted}>{categoriaBase(c.data_nascimento)} • {c.posicao} • {idadeJogador(c.data_nascimento)} anos • {c.nacionalidade}</p>
                        <div style={{display:'flex',gap:18,margin:'12px 0'}}>
                          <div><span style={styles.eyebrow}>OVERALL</span><div style={{fontSize:24,fontWeight:'bold'}}>{c.overall}</div></div>
                          <div><span style={styles.eyebrow}>POTENCIAL</span><div style={{fontSize:24,fontWeight:'bold',color:c.is_star?'#facc15':'#67e8a5'}}>{c.potencial}</div></div>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button style={{...styles.primary,flex:1}} onClick={()=>contratarDaBase(c)} disabled={carregandoBase}>Contratar</button>
                          <button style={styles.secondary} onClick={()=>dispensarCandidato(c)} disabled={carregandoBase}>Dispensar</button>
                        </div>
                      </div>)}
                    </div>
                  </div>}
                  <div style={{marginTop:22}}>
                    <h3>Elenco da categoria de base</h3>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>
                      {['Todas','Sub-15','Sub-17','Sub-20'].map(categoria => {
                        const quantidade = categoria === 'Todas' ? jogadoresBase.length : jogadoresBase.filter(j => categoriaBase(j.data_nascimento) === categoria).length;
                        return <button key={categoria} style={categoriaBaseSelecionada === categoria ? styles.primary : styles.secondary} onClick={() => setCategoriaBaseSelecionada(categoria)}>{categoria} ({quantidade})</button>;
                      })}
                    </div>
                    {jogadoresBaseFiltrados.length===0 ? <p style={styles.muted}>{jogadoresBase.length===0 ? 'Sua base ainda não tem jogadores. Abra uma peneira para descobrir os primeiros talentos.' : 'Não há atletas nesta categoria.'}</p> :
                      <div style={{overflowX:'auto'}}><table style={styles.table}>
                        <thead><tr><th>Jogador</th><th>Categoria</th><th>Idade</th><th>Posição</th><th>Overall</th><th>Potencial</th><th>Status</th><th>Ação</th></tr></thead>
                        <tbody>{jogadoresBaseFiltrados.map(j=><tr key={j.id}>
                          <td>{j.nome} {j.is_star&&<span style={{color:'#facc15'}}>★</span>}</td>
                          <td>{categoriaBase(j.data_nascimento)}</td><td>{idadeJogador(j.data_nascimento)} anos</td><td>{j.posicao}</td><td>{j.overall}</td>
                          <td style={{color:j.is_star?'#facc15':'#67e8a5'}}>{j.potencial}</td>
                          <td>{j.is_star?'Jovem estrela':'Em desenvolvimento'}</td>
                          <td>{idadeJogador(j.data_nascimento)>=18 ? <button style={styles.primary} onClick={()=>promoverJogador(j)} disabled={carregandoBase}>Promover</button> : <span style={styles.mutedSmall}>Em formação</span>}</td>
                        </tr>)}</tbody>
                      </table></div>}
                  </div>
                </>}
                <p style={styles.mutedSmall}>O catálogo profissional do MFO mantém jogadores reais quando disponíveis na base de elencos. Os nomes gerados nas peneiras desta versão ainda são fictícios; a importação de jovens reais exige uma lista Sub-15/Sub-17/Sub-20 validada e sem duplicar atletas já vinculados a clubes. A promoção preserva o ID e o histórico do jogador.</p>
              </div> :
              aba === 'Estádio' ? <div>
                <p style={styles.muted}>Seu clube começa com um estádio de 10 mil lugares. As ampliações são financiadas pelo caixa do clube e levam tempo para ficar prontas.</p>
                <div style={{background:'#0a1a12',border:'1px solid #2a6a47',borderRadius:12,padding:20,marginTop:16}}>
                  <span style={styles.eyebrow}>INFRAESTRUTURA ATUAL</span>
                  <h3 style={{fontSize:28,margin:'8px 0',color:'#67e8a5'}}>{Number(clubeAtual?.capacidade || 10000).toLocaleString('pt-BR')} lugares</h3>
                  <p style={styles.muted}>{clubeAtual?.estadio || 'Estádio do clube'} • Nível {Number(clubeAtual?.stadium_level || 1)} de 4</p>
                  <p style={styles.muted}>Caixa disponível: <strong>R$ {Number(clubeAtual?.orcamento || 0).toLocaleString('pt-BR')}</strong></p>
                </div>
                {clubeAtual?.stadium_upgrade_finishes_at ? <div style={{background:'#112a1c',borderRadius:10,padding:16,marginTop:16}}>
                  <strong>Obra em andamento</strong>
                  <p style={styles.muted}>Nova capacidade: {Number(clubeAtual.stadium_target_capacity).toLocaleString('pt-BR')} lugares</p>
                  <p style={styles.muted}>Previsão de conclusão: {new Date(clubeAtual.stadium_upgrade_finishes_at).toLocaleDateString('pt-BR')}</p>
                  <p style={styles.mutedSmall}>A capacidade será atualizada automaticamente quando a obra terminar e o clube acessar o jogo.</p>
                </div> : Number(clubeAtual?.stadium_level || 1) >= 4 ? <p style={styles.notice}>Seu estádio atingiu o nível máximo de expansão.</p> : <div style={{marginTop:18}}>
                  <h3>Próxima ampliação</h3>
                  {(() => { const prox = niveisEstadio.find(n => n.nivel === Number(clubeAtual?.stadium_level || 1) + 1); return prox ? <div style={{background:'#112a1c',borderRadius:10,padding:16}}>
                    <strong>{prox.nome} • {prox.capacidade.toLocaleString('pt-BR')} lugares</strong>
                    <p style={styles.muted}>Investimento: R$ {prox.custo.toLocaleString('pt-BR')}</p>
                    <p style={styles.muted}>Tempo estimado: {prox.dias} dias</p>
                    <button style={styles.primary} onClick={iniciarAmpliacao} disabled={carregandoEstadio || Number(clubeAtual?.orcamento || 0) < prox.custo}>{carregandoEstadio ? 'Iniciando obra...' : 'Iniciar ampliação'}</button>
                    {Number(clubeAtual?.orcamento || 0) < prox.custo && <p style={styles.mutedSmall}>Caixa insuficiente. Gere mais receitas para liberar a obra.</p>}
                  </div> : null; })()}
                </div>}
                {mensagemEstadio && <p style={styles.notice}>{mensagemEstadio}</p>}
                <p style={styles.mutedSmall}>O investimento é debitado uma única vez e registrado no histórico financeiro. A bilheteria e a venda de camisas são calculadas quando uma partida é finalizada.</p>
              </div> :
              (aba === 'Liga' || aba === 'Partidas' || aba === 'Competições') ? <LeagueModule supabase={supabase} clubeAtual={clubeAtual} initialTab={aba === 'Partidas' ? 'jogos' : 'classificacao'} />
              : aba === 'Táticas' ? <TacticsModule club={clubeAtual} />
              : <><p>Módulo {aba} do Manager Futebol Online.</p><p>Esta área será conectada aos dados reais do clube nas próximas etapas de desenvolvimento.</p></>}
          </section>
          </div>
        </>
      )}
      <footer style={styles.footer}>Manager Futebol Online • Projeto em desenvolvimento</footer>
    </main>
  );
}

const styles = {
  page: {background:'#0a1a12', color:'#f8fafc', minHeight:'100vh', padding:24, fontFamily:'Arial, sans-serif'},
  header: {display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:24},
  heading: {color:'#67e8a5', margin:'0 0 8px'},
  muted: {color:'#9fb6a7', margin:'6px 0'},
  mutedSmall: {color:'#86a193', fontSize:12, marginTop:20},
  authCard: {maxWidth:430, margin:'7vh auto', padding:28, background:'#0d1f16', border:'1px solid #1a3d29', borderRadius:18, textAlign:'center'},
  tabs: {display:'flex', gap:8, margin:'22px 0 16px'},
  tab: {background:'#112a1c', color:'#e3f3e8', border:'1px solid #1f4a31', borderRadius:9, padding:'11px 15px', cursor:'pointer'},
  activeTab: {background:'#168653', color:'#fff', border:'1px solid #67e8a5', borderRadius:9, padding:'11px 15px', cursor:'pointer', fontWeight:'bold'},
  input: {width:'100%', boxSizing:'border-box', padding:13, borderRadius:9, border:'1px solid #1f4a31', background:'#0a1a12', color:'#fff', fontSize:15, marginTop:6},
  formGrid: {display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginTop:20},
  primary: {background:'#168653', color:'#fff', border:0, borderRadius:9, padding:'13px 18px', cursor:'pointer', fontWeight:'bold'},
  secondary: {background:'#1a3d29', color:'#fff', border:0, borderRadius:9, padding:'10px 14px', cursor:'pointer'},
  link: {background:'transparent', border:0, color:'#67e8a5', marginTop:14, cursor:'pointer'},
  notice: {background:'#112a1c', color:'#e3f3e8', padding:12, borderRadius:9, fontSize:14, overflowWrap:'anywhere'},
  error: {background:'#3a1e25', color:'#fecaca', padding:12, borderRadius:9, fontSize:14, overflowWrap:'anywhere'},
  noticeBox: {background:'#332b18', border:'1px solid #8b6b2c', borderRadius:12, padding:18, marginBottom:20, color:'#f8e7b0'},
  club: {background:'linear-gradient(120deg,#123d32,#112a1c)', border:'1px solid #2a6a47', borderRadius:16, padding:22, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18},
  clubBadge: {width:62, height:62, borderRadius:18, background:'#67e8a5', color:'#0a1a12', display:'grid', placeItems:'center', fontWeight:'bold', fontSize:18, padding:6, textAlign:'center'},
  eyebrow: {color:'#67e8a5', fontSize:11, letterSpacing:2, fontWeight:'bold'},
  nav: {display:'flex', flexWrap:'wrap', gap:8, marginBottom:18},
  panel: {background:'#0d1f16', border:'1px solid #1a3d29', borderRadius:14, padding:22, minHeight:190},
  stats: {display:'flex', gap:12, flexWrap:'wrap', marginTop:24},
  table: {width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:14},
  filterLabel: {color:'#9fb6a7',fontSize:13},
  remove: {background:'#5b2630', color:'#fff', border:0, borderRadius:6, padding:'7px 10px', cursor:'pointer'},
  user: {fontSize:12, color:'#b4cdbd', maxWidth:220, overflowWrap:'anywhere'},
  footer: {color:'#6f8e7d', fontSize:12, textAlign:'center', marginTop:28}
};
