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
  const [jogadores, setJogadores] = useState([]);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [novoJogador, setNovoJogador] = useState({ nome: '', posicao: 'Atacante', data_nascimento: '', overall: 50 });
  const [erroElenco, setErroElenco] = useState('');
  const clubeAtual = clubes[0];

  const abas = ['Início', 'Elenco', 'Táticas', 'Liga', 'Mercado', 'Base'];

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
        capacidade: Number(capacidade) || 10000,
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
            <label>Capacidade<input style={styles.input} type="number" min="100" value={capacidade} onChange={e => setCapacidade(e.target.value)} required /></label>
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
                <p style={styles.muted}>Cadastre e gerencie os jogadores do seu clube. Os dados ficam salvos no banco.</p>
                <form onSubmit={adicionarJogador} style={styles.formGrid}>
                  <label>Nome do jogador<input style={styles.input} value={novoJogador.nome} onChange={e => setNovoJogador({...novoJogador, nome:e.target.value})} required placeholder="Nome completo" /></label>
                  <label>Posição<select style={styles.input} value={novoJogador.posicao} onChange={e => setNovoJogador({...novoJogador, posicao:e.target.value})}>{['Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'].map(p => <option key={p}>{p}</option>)}</select></label>
                  <label>Data de nascimento<input style={styles.input} type="date" value={novoJogador.data_nascimento} onChange={e => setNovoJogador({...novoJogador, data_nascimento:e.target.value})} /></label>
                  <label>Overall inicial<input style={styles.input} type="number" min="1" max="99" value={novoJogador.overall} onChange={e => setNovoJogador({...novoJogador, overall:e.target.value})} /></label>
                  <button style={styles.primary} disabled={carregando}>{carregando ? 'Salvando...' : 'Adicionar jogador'}</button>
                </form>
                {erroElenco && <p style={styles.error}>{erroElenco}</p>}
                {carregandoJogadores ? <p>Carregando elenco...</p> : jogadores.length === 0 ? <p style={styles.muted}>Nenhum jogador cadastrado ainda.</p> :
                  <div style={{overflowX:'auto', marginTop:20}}><table style={styles.table}><thead><tr><th>Jogador</th><th>Posição</th><th>Nascimento</th><th>Overall</th><th></th></tr></thead><tbody>
                    {jogadores.map(j => <tr key={j.id}><td>{j.nome}</td><td>{j.posicao || '-'}</td><td>{j.data_nascimento ? new Date(j.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td><td>{j.overall}</td><td><button style={styles.remove} onClick={() => removerJogador(j.id)}>Remover</button></td></tr>)}
                  </tbody></table></div>}
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
  remove: {background:'#5b2630', color:'#fff', border:0, borderRadius:6, padding:'7px 10px', cursor:'pointer'},
  user: {fontSize:12, color:'#b7c6d8', maxWidth:220, overflowWrap:'anywhere'},
  footer: {color:'#718096', fontSize:12, textAlign:'center', marginTop:28}
};
