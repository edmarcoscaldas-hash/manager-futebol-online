import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase.js';

export default function App() {
  const [aba, setAba] = useState('Início');
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
  const [nomeClube, setNomeClube] = useState('');
  const [sigla, setSigla] = useState('');
  const [cidade, setCidade] = useState('');
  const [estadio, setEstadio] = useState('');
  const [capacidade, setCapacidade] = useState('10000');
  const [erroClube, setErroClube] = useState('');
  const [mensagemEstadio, setMensagemEstadio] = useState('');
  const [carregandoEstadio, setCarregandoEstadio] = useState(false);
  const [respostaImprensa, setRespostaImprensa] = useState('');
  const [impactoImprensa, setImpactoImprensa] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [novoJogador, setNovoJogador] = useState({ nome: '', posicao: 'Atacante', data_nascimento: '', overall: 50 });
  const [erroElenco, setErroElenco] = useState('');
  const [ligaPais, setLigaPais] = useState('Brasil');
  const [ligaDivisao, setLigaDivisao] = useState('1ª divisão');
  const [jogadoresMercado, setJogadoresMercado] = useState([]);
  const [clubesMercado, setClubesMercado] = useState([]);
  const [ligasMercado, setLigasMercado] = useState([]);
  const [carregandoMercado, setCarregandoMercado] = useState(false);
  const [erroMercado, setErroMercado] = useState('');
  const [filtroPosicao, setFiltroPosicao] = useState('Todas');
  const [filtroClube, setFiltroClube] = useState('Todos');
  const [filtroLiga, setFiltroLiga] = useState('Todas');
  const [filtroNacionalidade, setFiltroNacionalidade] = useState('Todas');
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState('todos');
  const [overallMin, setOverallMin] = useState('0');
  const [overallMax, setOverallMax] = useState('100');
  const [valorMin, setValorMin] = useState('0');
  const [valorMax, setValorMax] = useState('100000000');
  const clubeAtual = clubes[0];

  const abas = ['Início', 'Elenco', 'Táticas', 'Liga', 'Mercado', 'Base', 'Estádio', 'Imprensa', 'Rankings'];

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
    async function carregarClubes() {
      if (!session || !supabase) {
        setClubes([]);
        return;
      }
      setCarregandoClubes(true);
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: true });
      if (!ativo) return;
      if (error) setErroClube('Não foi possível carregar seus clubes: ' + error.message);
      else setClubes(data || []);
      setCarregandoClubes(false);
    }
    carregarClubes();
    return () => { ativo = false; };
  }, [session]);

  useEffect(() => {
    let ativo = true;
    async function carregarJogadores() {
      if (!clubeAtual?.id || !supabase || aba !== 'Elenco') return;
      setCarregandoJogadores(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', clubeAtual.id)
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
      const [playersRes, clubsRes, leaguesRes] = await Promise.all([
        supabase.from('players').select('*').order('overall', { ascending: false }),
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
      setClubes([data]);
      setMensagem('Clube criado e salvo no banco de dados!');
      setNomeClube('');
      setSigla('');
      setCidade('');
      setEstadio('');
      setCapacidade('10000');
    }
    setCarregando(false);
  }

  const niveisEstadio = [
    { nivel: 2, capacidade: 20000, custo: 8000000, dias: 14, nome: 'Ampliação' },
    { nivel: 3, capacidade: 40000, custo: 20000000, dias: 30, nome: 'Estádio moderno' },
    { nivel: 4, capacidade: 70000, custo: 45000000, dias: 45, nome: 'Arena' }
  ];

  async function iniciarAmpliacao() {
    if (!clubeAtual?.id || !supabase) return;
    const nivelAtual = Number(clubeAtual.stadium_level || 1);
    const proximo = niveisEstadio.find(n => n.nivel === nivelAtual + 1);
    if (!proximo) return;
    const saldo = Number(clubeAtual.orcamento || 0);
    if (saldo < proximo.custo) {
      setMensagemEstadio('Saldo insuficiente. O clube precisa acumular mais receitas antes de iniciar a obra.');
      return;
    }
    setCarregandoEstadio(true);
    setMensagemEstadio('');
    const inicio = new Date();
    const fim = new Date(inicio.getTime() + proximo.dias * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase.from('clubs').update({
      orcamento: saldo - proximo.custo,
      stadium_target_capacity: proximo.capacidade,
      stadium_upgrade_started_at: inicio.toISOString(),
      stadium_upgrade_finishes_at: fim.toISOString()
    }).eq('id', clubeAtual.id).select().single();
    if (error) setMensagemEstadio('Não foi possível iniciar a obra: ' + error.message);
    else {
      setClubes(lista => lista.map(clube => clube.id === data.id ? data : clube));
      setMensagemEstadio('Obra iniciada! O estádio ficará em ampliação por ' + proximo.dias + ' dias.');
    }
    setCarregandoEstadio(false);
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
          <div style={{fontSize: 42}}>⚽</div>
          <h1 style={styles.heading}>Manager Futebol Online</h1>
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
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>⚽ Manager Futebol Online</h1>
          <p style={styles.muted}>Temporada 1 • Brasil • Universo público</p>
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
          <span style={styles.eyebrow}>PRIMEIRO PASSO DO TREINADOR</span>
          <h2>Crie seu clube</h2>
          <p style={styles.muted}>Cadastre a identidade do seu time. As informações serão salvas na sua conta.</p>
          <form onSubmit={criarClube} style={styles.formGrid}>
            <label>Nome do clube<input style={styles.input} value={nomeClube} onChange={e => setNomeClube(e.target.value)} placeholder="Ex.: União Caçapavense" required /></label>
            <label>Sigla<input style={styles.input} value={sigla} onChange={e => setSigla(e.target.value)} placeholder="Ex.: UCA" maxLength={5} required /></label>
            <label>Cidade<input style={styles.input} value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade" required /></label>
            <label>Estádio<input style={styles.input} value={estadio} onChange={e => setEstadio(e.target.value)} placeholder="Nome do estádio" /></label>
            <label>Capacidade inicial<input style={styles.input} type="number" value="10000" readOnly /></label>
            <button style={styles.primary} disabled={carregando}>{carregando ? 'Salvando...' : 'Criar meu clube'}</button>
          </form>
          {erroClube && <p style={styles.error}>{erroClube}</p>}
          {mensagem && <p style={styles.notice}>{mensagem}</p>}
        </section>
      ) : (
        <>
          {clubeAtual && <section style={styles.club}>
            <div>
              <span style={styles.eyebrow}>SEU CLUBE</span>
              <h2>{clubeAtual.nome}</h2>
              <p style={styles.muted}>{clubeAtual.cidade} • {clubeAtual.pais}</p>
              <p style={styles.muted}>Estádio: {clubeAtual.estadio || 'A definir'} • Capacidade: {Number(clubeAtual.capacidade).toLocaleString('pt-BR')}</p>
            </div>
            <div style={styles.clubBadge}>{clubeAtual.sigla || 'MFO'}</div>
          </section>}
          <nav style={styles.nav}>
            {abas.map(item => <button key={item} onClick={() => setAba(item)} style={aba === item ? styles.activeTab : styles.tab}>{item}</button>)}
          </nav>
          <section style={styles.panel}>
            <h2>{aba}</h2>
            {aba === 'Início' ? <><p>Bem-vindo ao Manager Futebol Online!</p><p>Seu clube está cadastrado na sua conta.</p><div style={styles.stats}><div><strong>R$ {Number(clubeAtual?.orcamento || 0).toLocaleString('pt-BR')}</strong><span>Orçamento inicial</span></div><div><strong>{jogadores.length}</strong><span>Jogadores carregados</span></div><div><strong>1ª</strong><span>Temporada</span></div></div></> :
              aba === 'Elenco' ? <div>
                <p style={styles.muted}>Seu clube começa do zero. Os jogadores serão adquiridos exclusivamente pelo Mercado, por compra, empréstimo ou contratação sem contrato.</p>
                {erroElenco && <p style={styles.error}>{erroElenco}</p>}
                {carregandoJogadores ? <p>Carregando elenco...</p> : jogadores.length === 0 ? <div style={{background:'#0b1220',border:'1px dashed #40536d',borderRadius:12,padding:24,marginTop:18}}>
                  <h3 style={{marginTop:0}}>Elenco vazio</h3>
                  <p style={styles.muted}>Você ainda não tem jogadores. Acesse a área Mercado para montar seu primeiro elenco.</p>
                  <button style={styles.primary} onClick={() => setAba('Mercado')}>Ir para o Mercado</button>
                </div> :
                  <div style={{overflowX:'auto', marginTop:20}}><table style={styles.table}><thead><tr><th>Jogador</th><th>Posição</th><th>Nascimento</th><th>Overall</th></tr></thead><tbody>
                    {jogadores.map(j => <tr key={j.id}><td>{j.nome}</td><td>{j.posicao || '-'}</td><td>{j.data_nascimento ? new Date(j.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td><td>{j.overall}</td></tr>)}
                  </tbody></table></div>}
              </div> :
              aba === 'Mercado' ? <div>
                <p style={styles.muted}>Encontre jogadores cadastrados no banco de dados do MFO. Use os filtros para montar seu elenco.</p>
                {erroMercado && <p style={styles.error}>{erroMercado}</p>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,background:'#0b1220',border:'1px solid #34465f',borderRadius:12,padding:16,marginTop:16}}>
                  <label style={styles.filterLabel}>Posição<select style={styles.input} value={filtroPosicao} onChange={e=>setFiltroPosicao(e.target.value)}>{['Todas','Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'].map(x=><option key={x}>{x}</option>)}</select></label>
                  <label style={styles.filterLabel}>Clube<select style={styles.input} value={filtroClube} onChange={e=>setFiltroClube(e.target.value)}><option value="Todos">Todos os clubes</option>{clubesMercado.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
                  <label style={styles.filterLabel}>Liga<select style={styles.input} value={filtroLiga} onChange={e=>setFiltroLiga(e.target.value)}><option value="Todas">Todas as ligas</option>{ligasMercado.map(x=><option key={x.id} value={x.id}>{x.nome} • {x.pais} • {x.divisao}</option>)}</select></label>
                  <label style={styles.filterLabel}>Nacionalidade<select style={styles.input} value={filtroNacionalidade} onChange={e=>setFiltroNacionalidade(e.target.value)}><option value="Todas">Todas</option>{[...new Set(jogadoresMercado.map(x=>x.nacionalidade).filter(Boolean))].sort().map(x=><option key={x}>{x}</option>)}</select></label>
                  <label style={styles.filterLabel}>Disponibilidade<select style={styles.input} value={filtroDisponibilidade} onChange={e=>setFiltroDisponibilidade(e.target.value)}><option value="todos">Todas</option><option value="transferencia">À venda</option><option value="emprestimo">Empréstimo</option><option value="livre">Sem contrato</option></select></label>
                  <label style={styles.filterLabel}>Overall mínimo<input style={styles.input} type="number" min="0" max="100" value={overallMin} onChange={e=>setOverallMin(e.target.value)} /></label>
                  <label style={styles.filterLabel}>Overall máximo<input style={styles.input} type="number" min="0" max="100" value={overallMax} onChange={e=>setOverallMax(e.target.value)} /></label>
                  <label style={styles.filterLabel}>Valor mínimo (R$)<input style={styles.input} type="number" min="0" value={valorMin} onChange={e=>setValorMin(e.target.value)} /></label>
                  <label style={styles.filterLabel}>Valor máximo (R$)<input style={styles.input} type="number" min="0" value={valorMax} onChange={e=>setValorMax(e.target.value)} /></label>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginTop:16}}>
                  <strong>{carregandoMercado ? 'Buscando jogadores...' : jogadoresFiltrados.length + ' jogador(es) encontrado(s)'}</strong>
                  <button style={styles.secondary} onClick={()=>{setFiltroPosicao('Todas');setFiltroClube('Todos');setFiltroLiga('Todas');setFiltroNacionalidade('Todas');setFiltroDisponibilidade('todos');setOverallMin('0');setOverallMax('100');setValorMin('0');setValorMax('100000000');}}>Limpar filtros</button>
                </div>
                {!carregandoMercado && jogadoresFiltrados.length === 0 ? <div style={{background:'#0b1220',border:'1px dashed #40536d',borderRadius:12,padding:22,marginTop:14}}><h3 style={{marginTop:0}}>Nenhum jogador encontrado</h3><p style={styles.muted}>O catálogo ainda está vazio ou não há jogadores com esses critérios. Os jogadores aparecerão aqui quando forem cadastrados no mercado.</p></div> :
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,marginTop:14}}>
                  {jogadoresFiltrados.map(j=>{const clube=clubesMercado.find(x=>x.id===j.club_id);const status=j.status_contrato==='livre'?'Sem contrato':j.disponivel_emprestimo?'Disponível para empréstimo':j.disponivel_transferencia?'À venda':'No elenco';return <article key={j.id} style={{background:'#0b1220',border:'1px solid #34465f',borderRadius:12,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'start'}}><div><strong>{j.nome}</strong><p style={styles.mutedSmall}>{j.posicao || 'Posição não informada'} • {j.nacionalidade || 'Nacionalidade não informada'}</p></div><span style={{background:'#176b4b',padding:'6px 9px',borderRadius:8,fontWeight:'bold'}}>OVR {j.overall ?? '-'}</span></div>
                    <p style={styles.muted}>Clube: {clube?.nome || (j.status_contrato==='livre'?'Jogador livre':'Clube não identificado')}</p><p style={styles.muted}>Valor: R$ {Number(j.valor_mercado || 0).toLocaleString('pt-BR')}</p><p style={{color:'#67e8a5',fontSize:13}}>{status}</p>{j.is_star && <span style={styles.eyebrow}>★ JOGADOR ESTRELA</span>}
                  </article>;})}
                </div>}
                <p style={styles.mutedSmall}>A busca e os filtros consultam os registros do Supabase. Envio, resposta e conclusão de propostas serão ativados na próxima etapa, com validação de saldo, janela de transferências e atualização segura dos contratos.</p>
              </div> :
              aba === 'Imprensa' ? <div>
                <p style={styles.muted}>Central de imprensa do clube. Responda às entrevistas após clássicos, semifinais, finais, decisões importantes e partidas marcantes.</p>
                <div style={{background:'#0b1220',border:'1px solid #285b49',borderRadius:12,padding:20,marginTop:16}}>
                  <span style={styles.eyebrow}>ENTREVISTA PÓS-JOGO</span>
                  <h3 style={{marginTop:10}}>O que achou da derrota da equipe?</h3>
                  <p style={styles.muted}>Como treinador, escolha exatamente o que você diria aos jornalistas. Cada declaração terá consequências diferentes para a relação com diretoria, jogadores e torcida.</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12,marginTop:16}}>
                    {Object.entries({
                      elogiar: '“O resultado é doloroso, mas não vou deixar de reconhecer o esforço dos jogadores. Competimos, tivemos momentos em que controlamos a partida e criamos situações para sair com outro placar. Claro que precisamos melhorar a concentração nos momentos decisivos. Agora é levantar a cabeça, corrigir os detalhes e trabalhar. Não tenho dúvida de que esse grupo pode dar uma resposta.”',
                      reconhecer: '“Hoje não estivemos no nosso nível. Erramos passes simples, perdemos duelos importantes e demos espaços que um adversário desse nível não costuma desperdiçar. Não adianta procurar desculpas: precisamos jogar mais e melhor. A responsabilidade é de todos, começando por mim, e vamos trabalhar para corrigir isso.”',
                      criticar: '“Foi uma atuação muito abaixo do que a camisa deste clube exige. Faltou intensidade, concentração e personalidade em momentos importantes. Não podemos entrar em campo esperando que o jogo se resolva sozinho. Vou conversar com o elenco, porque algumas atitudes precisam mudar. Ninguém tem lugar garantido se não corresponder.”',
                      proteger: '“A responsabilidade maior é minha. Sou eu quem prepara a equipe, escolhe a estratégia e toma as decisões. Não vou apontar o dedo para um jogador depois de uma derrota. Temos um grupo trabalhador e vamos resolver nossas questões internamente. Peço ao torcedor que continue apoiando, porque precisamos estar unidos neste momento.”',
                      cobrar: '“Não podemos tratar essa derrota como se fosse normal. O torcedor espera entrega e competitividade, e nós temos a obrigação de oferecer isso. A conversa no vestiário será franca. Quero ver mais atitude nos treinamentos e uma resposta dentro de campo já na próxima rodada. O discurso precisa virar resultado.”'
                    }).map(([tipo, fala]) => (
                      <button key={tipo} style={{...styles.secondary,textAlign:'left',lineHeight:1.7,padding:16,fontSize:14}} onClick={() => responderImprensa(tipo)}>{fala}</button>
                    ))}
                  </div>
                </div>
                {respostaImprensa && <div style={{background:'#17263b',border:'1px solid #40536d',borderRadius:12,padding:18,marginTop:16}}>
                  <span style={styles.eyebrow}>DECLARAÇÃO À IMPRENSA</span>
                  <h3>{respostaImprensa}</h3>
                  <p style={{color:"#dbe7f5",fontSize:15,lineHeight:1.8,marginTop:12}}>{impactoImprensa}</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:16}}>
                    <div style={{background:'#0b1220',borderRadius:9,padding:12}}><strong>Diretoria</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_diretoria ?? 50)}/100</div></div>
                    <div style={{background:'#0b1220',borderRadius:9,padding:12}}><strong>Jogadores</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_jogadores ?? 50)}/100</div></div>
                    <div style={{background:'#0b1220',borderRadius:9,padding:12}}><strong>Torcida</strong><div style={{fontSize:23,color:'#67e8a5'}}>{Number(clubeAtual?.reputacao_torcida ?? 50)}/100</div></div>
                  </div>
                  <button style={styles.secondary} onClick={() => {setRespostaImprensa('');setImpactoImprensa(null);}}>Nova entrevista</button>
                </div>}
                <p style={styles.mutedSmall}>As reputações são registradas no clube e variam conforme sua declaração. Nesta etapa, os efeitos ainda não são calculados automaticamente pelo resultado real da partida.</p>
              </div> :
              aba === 'Rankings' ? <div>
                <p style={styles.muted}>Central de rankings mundiais e classificações por liga. Os exemplos desta tela são demonstrativos; as tabelas oficiais dependerão dos resultados reais das temporadas.</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14,marginTop:18}}>
                  <div style={{background:'#0b1220',border:'1px solid #285b49',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>RANKING MUNDIAL DE CLUBES</span><h3>Clubes em destaque</h3>
                    {['União Caçapavense','Real Madrid','Manchester City','Bayern de Munique','Flamengo'].map((x,i)=><p key={i}>{i+1}º {x}</p>)}
                  </div>
                  <div style={{background:'#0b1220',border:'1px solid #40536d',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>RANKING MUNDIAL DE SELEÇÕES</span><h3>Seleções em destaque</h3>
                    {['Brasil','Argentina','França','Espanha','Inglaterra'].map((x,i)=><p key={i}>{i+1}º {x}</p>)}
                  </div>
                  <div style={{background:'#0b1220',border:'1px solid #40536d',borderRadius:12,padding:16}}>
                    <span style={styles.eyebrow}>ARTILHARIA GERAL</span><h3>Goleadores</h3>
                    {['Erling Haaland','Kylian Mbappé','Vinícius Júnior','Harry Kane','Endrick'].map((x,i)=><p key={i}>{i+1}º {x} — aguardando jogos</p>)}
                  </div>
                </div>
                <div style={{background:'#0b1220',border:'1px solid #285b49',borderRadius:12,padding:18,marginTop:18}}>
                  <span style={styles.eyebrow}>CLASSIFICAÇÃO POR LIGA</span>
                  <h3>Escolha o campeonato</h3>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
                    <label style={{color:'#a7b3c5',fontSize:13}}>País
                      <select style={styles.input} value={ligaPais} onChange={e=>setLigaPais(e.target.value)}>
                        {['Brasil','Argentina','Inglaterra','Espanha','Alemanha','Itália','França','Portugal','Holanda','México'].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </label>
                    <label style={{color:'#a7b3c5',fontSize:13}}>Divisão
                      <select style={styles.input} value={ligaDivisao} onChange={e=>setLigaDivisao(e.target.value)}>
                        <option value="1ª divisão">1ª divisão</option><option value="2ª divisão">2ª divisão</option>
                      </select>
                    </label>
                  </div>
                  <p style={styles.mutedSmall}>{ligaPais} • {ligaDivisao} • Temporada 1 — prévia ilustrativa</p>
                  <div style={{overflowX:'auto'}}>
                    <table style={styles.table}>
                      <thead><tr><th>Pos.</th><th>Clube</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead>
                      <tbody>
                        {Array.from({length:10},(_,i)=>({pos:i+1,nome:i===0?(ligaPais==='Brasil'?'União Caçapavense':ligaPais+' FC'):['Atlético Serrano','Real do Vale','Esportivo Central','Nacional FC','Ferroviário','União Atlética','Estrela do Norte','Grêmio Regional','Desportivo Azul'][i-1]})).map(t=><tr key={t.pos}><td>{t.pos}º</td><td>{t.nome}</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <p style={styles.mutedSmall}>Cada país terá sua própria classificação e divisões. A versão completa também exibirá forma recente, saldo de gols, artilharia e assistências específicas da liga.</p>
                </div>
                <div style={{background:'#17263b',borderRadius:10,padding:16,marginTop:16}}>
                  <strong>Premiações e recordes históricos</strong>
                  <ul style={{color:'#cbd5e1',lineHeight:1.8,paddingLeft:20}}>
                    <li>Bola de Ouro, melhor treinador e melhor goleiro</li><li>Revelação e melhor jogador por posição</li><li>Artilheiros por liga e no ranking geral</li><li>Maiores campeões e recordistas de todos os tempos</li>
                  </ul>
                </div>
              </div> :
              aba === 'Estádio' ? <div>
                <p style={styles.muted}>Seu clube começa com um estádio de 10 mil lugares. As ampliações são financiadas pelo caixa do clube e levam tempo para ficar prontas.</p>
                <div style={{background:'#0b1220',border:'1px solid #285b49',borderRadius:12,padding:20,marginTop:16}}>
                  <span style={styles.eyebrow}>INFRAESTRUTURA ATUAL</span>
                  <h3 style={{fontSize:28,margin:'8px 0',color:'#67e8a5'}}>{Number(clubeAtual?.capacidade || 10000).toLocaleString('pt-BR')} lugares</h3>
                  <p style={styles.muted}>{clubeAtual?.estadio || 'Estádio do clube'} • Nível {Number(clubeAtual?.stadium_level || 1)} de 4</p>
                  <p style={styles.muted}>Caixa disponível: <strong>R$ {Number(clubeAtual?.orcamento || 0).toLocaleString('pt-BR')}</strong></p>
                </div>
                {clubeAtual?.stadium_upgrade_finishes_at ? <div style={{background:'#17263b',borderRadius:10,padding:16,marginTop:16}}>
                  <strong>Obra em andamento</strong>
                  <p style={styles.muted}>Nova capacidade: {Number(clubeAtual.stadium_target_capacity).toLocaleString('pt-BR')} lugares</p>
                  <p style={styles.muted}>Previsão de conclusão: {new Date(clubeAtual.stadium_upgrade_finishes_at).toLocaleDateString('pt-BR')}</p>
                  <p style={styles.mutedSmall}>A capacidade será atualizada automaticamente quando a obra terminar e o clube acessar o jogo.</p>
                </div> : Number(clubeAtual?.stadium_level || 1) >= 4 ? <p style={styles.notice}>Seu estádio atingiu o nível máximo de expansão.</p> : <div style={{marginTop:18}}>
                  <h3>Próxima ampliação</h3>
                  {(() => { const prox = niveisEstadio.find(n => n.nivel === Number(clubeAtual?.stadium_level || 1) + 1); return prox ? <div style={{background:'#17263b',borderRadius:10,padding:16}}>
                    <strong>{prox.nome} • {prox.capacidade.toLocaleString('pt-BR')} lugares</strong>
                    <p style={styles.muted}>Investimento: R$ {prox.custo.toLocaleString('pt-BR')}</p>
                    <p style={styles.muted}>Tempo estimado: {prox.dias} dias</p>
                    <button style={styles.primary} onClick={iniciarAmpliacao} disabled={carregandoEstadio || Number(clubeAtual?.orcamento || 0) < prox.custo}>{carregandoEstadio ? 'Iniciando obra...' : 'Iniciar ampliação'}</button>
                    {Number(clubeAtual?.orcamento || 0) < prox.custo && <p style={styles.mutedSmall}>Caixa insuficiente. Gere mais receitas para liberar a obra.</p>}
                  </div> : null; })()}
                </div>}
                {mensagemEstadio && <p style={styles.notice}>{mensagemEstadio}</p>}
                <p style={styles.mutedSmall}>Os custos e prazos são valores iniciais de balanceamento. A integração com bilheteria e outras receitas será feita no módulo financeiro.</p>
              </div> :
              <><p>Módulo {aba} do Manager Futebol Online.</p><p>Esta área será conectada aos dados reais do clube nas próximas etapas de desenvolvimento.</p></>}
          </section>
        </>
      )}
      <footer style={styles.footer}>Manager Futebol Online • Projeto em desenvolvimento</footer>
    </main>
  );
}

const styles = {
  page: {background:'#0b1220', color:'#f8fafc', minHeight:'100vh', padding:24, fontFamily:'Arial, sans-serif'},
  header: {display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:24},
  heading: {color:'#67e8a5', margin:'0 0 8px'},
  muted: {color:'#a7b3c5', margin:'6px 0'},
  mutedSmall: {color:'#8492a6', fontSize:12, marginTop:20},
  authCard: {maxWidth:430, margin:'7vh auto', padding:28, background:'#111c2e', border:'1px solid #26364d', borderRadius:18, textAlign:'center'},
  tabs: {display:'flex', gap:8, margin:'22px 0 16px'},
  tab: {background:'#17263b', color:'#dbe7f5', border:'1px solid #34465f', borderRadius:9, padding:'11px 15px', cursor:'pointer'},
  activeTab: {background:'#176b4b', color:'#fff', border:'1px solid #67e8a5', borderRadius:9, padding:'11px 15px', cursor:'pointer', fontWeight:'bold'},
  input: {width:'100%', boxSizing:'border-box', padding:13, borderRadius:9, border:'1px solid #34465f', background:'#0b1220', color:'#fff', fontSize:15, marginTop:6},
  formGrid: {display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginTop:20},
  primary: {background:'#168653', color:'#fff', border:0, borderRadius:9, padding:'13px 18px', cursor:'pointer', fontWeight:'bold'},
  secondary: {background:'#26364d', color:'#fff', border:0, borderRadius:9, padding:'10px 14px', cursor:'pointer'},
  link: {background:'transparent', border:0, color:'#67e8a5', marginTop:14, cursor:'pointer'},
  notice: {background:'#17263b', color:'#dbe7f5', padding:12, borderRadius:9, fontSize:14, overflowWrap:'anywhere'},
  error: {background:'#3a1e25', color:'#fecaca', padding:12, borderRadius:9, fontSize:14, overflowWrap:'anywhere'},
  noticeBox: {background:'#332b18', border:'1px solid #8b6b2c', borderRadius:12, padding:18, marginBottom:20, color:'#f8e7b0'},
  club: {background:'linear-gradient(120deg,#123d32,#17263b)', border:'1px solid #285b49', borderRadius:16, padding:22, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18},
  clubBadge: {width:62, height:62, borderRadius:18, background:'#67e8a5', color:'#0b1220', display:'grid', placeItems:'center', fontWeight:'bold', fontSize:18, padding:6, textAlign:'center'},
  eyebrow: {color:'#67e8a5', fontSize:11, letterSpacing:2, fontWeight:'bold'},
  nav: {display:'flex', flexWrap:'wrap', gap:8, marginBottom:18},
  panel: {background:'#111c2e', border:'1px solid #26364d', borderRadius:14, padding:22, minHeight:190},
  stats: {display:'flex', gap:12, flexWrap:'wrap', marginTop:24},
  table: {width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:14},
  filterLabel: {color:'#a7b3c5',fontSize:13},
  remove: {background:'#5b2630', color:'#fff', border:0, borderRadius:6, padding:'7px 10px', cursor:'pointer'},
  user: {fontSize:12, color:'#b7c6d8', maxWidth:220, overflowWrap:'anywhere'},
  footer: {color:'#718096', fontSize:12, textAlign:'center', marginTop:28}
};
