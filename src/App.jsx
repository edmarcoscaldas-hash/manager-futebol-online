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

  const abas = ['Início', 'Elenco', 'Táticas', 'Liga', 'Mercado', 'Base'];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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

  async function sair() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setDemo(false);
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
      <section style={styles.club}>
        <div>
          <span style={styles.eyebrow}>SEU CLUBE</span>
          <h2>União Caçapavense</h2>
          <p style={styles.muted}>Caçapava • Brasil</p>
        </div>
        <div style={styles.clubBadge}>UC</div>
      </section>
      <nav style={styles.nav}>
        {abas.map(item => <button key={item} onClick={() => setAba(item)} style={aba === item ? styles.activeTab : styles.tab}>{item}</button>)}
      </nav>
      <section style={styles.panel}>
        <h2>{aba}</h2>
        {aba === 'Início' ? <><p>Bem-vindo ao Manager Futebol Online!</p><p>Seu clube está pronto para iniciar a temporada.</p><div style={styles.stats}><div><strong>R$ 5 mi</strong><span>Orçamento inicial</span></div><div><strong>18</strong><span>Jogadores</span></div><div><strong>1ª</strong><span>Temporada</span></div></div></> :
          <><p>Módulo {aba} do Manager Futebol Online.</p><p>Esta área será conectada aos dados reais do clube nas próximas etapas de desenvolvimento.</p></>}
      </section>
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
  input: {width:'100%', padding:13, borderRadius:9, border:'1px solid #34465f', background:'#0b1220', color:'#fff', fontSize:15},
  primary: {background:'#168653', color:'#fff', border:0, borderRadius:9, padding:'13px 18px', cursor:'pointer', fontWeight:'bold'},
  secondary: {background:'#26364d', color:'#fff', border:0, borderRadius:9, padding:'10px 14px', cursor:'pointer'},
  link: {background:'transparent', border:0, color:'#67e8a5', marginTop:14, cursor:'pointer'},
  notice: {background:'#17263b', color:'#dbe7f5', padding:12, borderRadius:9, fontSize:14, overflowWrap:'anywhere'},
  noticeBox: {background:'#332b18', border:'1px solid #8b6b2c', borderRadius:12, padding:18, marginBottom:20, color:'#f8e7b0'},
  club: {background:'linear-gradient(120deg,#123d32,#17263b)', border:'1px solid #285b49', borderRadius:16, padding:22, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18},
  clubBadge: {width:62, height:62, borderRadius:18, background:'#67e8a5', color:'#0b1220', display:'grid', placeItems:'center', fontWeight:'bold', fontSize:22},
  eyebrow: {color:'#67e8a5', fontSize:11, letterSpacing:2, fontWeight:'bold'},
  nav: {display:'flex', flexWrap:'wrap', gap:8, marginBottom:18},
  panel: {background:'#111c2e', border:'1px solid #26364d', borderRadius:14, padding:22, minHeight:190},
  stats: {display:'flex', gap:12, flexWrap:'wrap', marginTop:24},
  user: {fontSize:12, color:'#b7c6d8', maxWidth:220, overflowWrap:'anywhere'},
  footer: {color:'#718096', fontSize:12, textAlign:'center', marginTop:28}
};
