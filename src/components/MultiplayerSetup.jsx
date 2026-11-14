import { useEffect, useMemo, useState } from 'react';

const FORMATIONS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2'];
const styles = {
  panel:{background:'#0b1220',border:'1px solid #263b32',borderRadius:14,padding:18},
  input:{width:'100%',boxSizing:'border-box',padding:10,borderRadius:8,border:'1px solid #34465f',background:'#07110d',color:'#fff',fontSize:13},
  button:{background:'#168653',color:'#fff',border:0,borderRadius:9,padding:'10px 14px',cursor:'pointer',fontWeight:700},
  muted:{color:'#a7b3c5',fontSize:12,lineHeight:1.5},
  eyebrow:{color:'#67e8a5',fontSize:11,letterSpacing:1.5,fontWeight:800}
};
const emptySlots = count => Array(count).fill('');
const getAutoLineup = roster => {
  const sorted = [...roster].sort((a,b)=>Number(b.overall||0)-Number(a.overall||0));
  const goalkeeper = sorted.find(p=>(p.posicao||'').toLowerCase().includes('goleiro'));
  const rest = sorted.filter(p=>p.id!==goalkeeper?.id);
  return {starters:[goalkeeper?.id || '',...rest.slice(0,10).map(p=>p.id)],bench:rest.slice(10,17).map(p=>p.id)};
};

export default function MultiplayerSetup({supabase,room,members,user,membership}) {
  const [players,setPlayers]=useState([]);
  const [formation,setFormation]=useState('4-3-3');
  const [style,setStyle]=useState('balanced');
  const [mentality,setMentality]=useState('normal');
  const [starters,setStarters]=useState(emptySlots(11));
  const [bench,setBench]=useState(emptySlots(7));
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [opponentLineup,setOpponentLineup]=useState(null);
  const [hasSaved,setHasSaved]=useState(false);

  useEffect(()=>{
    let active=true;
    async function load(){
      if(!room?.id||!membership?.club_id||!user?.id){setLoading(false);return;}
      setLoading(true);setError('');
      const [rosterRes,savedRes,defaultsRes,allLineupsRes]=await Promise.all([
        supabase.from('players').select('id,nome,posicao,overall,energia,is_star').eq('club_id',membership.club_id).eq('is_youth',false).order('overall',{ascending:false}),
        supabase.from('mfo_room_lineups').select('*').eq('room_id',room.id).eq('user_id',user.id).maybeSingle(),
        supabase.from('club_default_lineups').select('starters,bench').eq('club_id',membership.club_id).maybeSingle(),
        supabase.from('mfo_room_lineups').select('user_id,club_id,formation,starters').eq('room_id',room.id)
      ]);
      if(!active)return;
      if(rosterRes.error){setError('Não foi possível carregar o elenco: '+rosterRes.error.message);setLoading(false);return;}
      const roster=rosterRes.data||[];
      setPlayers(roster);
      const saved=savedRes.data;
      const defaults=defaultsRes.data;
      setHasSaved(!!saved);
      const auto=getAutoLineup(roster);
      const initialStarters=saved?.starters || defaults?.starters || auto.starters;
      const initialBench=saved?.bench || defaults?.bench || auto.bench;
      setStarters(Array.from({length:11},(_,i)=>initialStarters?.[i]||''));
      setBench(Array.from({length:7},(_,i)=>initialBench?.[i]||''));
      setFormation(saved?.formation||'4-3-3');
      setStyle(saved?.tactical_style||'balanced');
      setMentality(saved?.mentality||'normal');
      setOpponentLineup((allLineupsRes.data||[]).find(x=>x.user_id!==user.id)||null);
      setLoading(false);
    }
    load();
    return()=>{active=false;};
  },[supabase,room?.id,membership?.club_id,user?.id]);

  useEffect(()=>{
    if(!room?.id)return undefined;
    const channel=supabase.channel('mfo-setup-'+room.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'mfo_room_lineups',filter:'room_id=eq.'+room.id},async()=>{
        const {data}=await supabase.from('mfo_room_lineups').select('user_id,club_id,formation,starters').eq('room_id',room.id);
        setOpponentLineup((data||[]).find(x=>x.user_id!==user?.id)||null);
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[supabase,room?.id,user?.id]);

  const selected=[...starters,...bench].filter(Boolean);
  const playerMap=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players]);
  const opponent=members.find(m=>m.role==='coach'&&m.user_id!==user?.id);
  const opponentReady=!!opponent?.ready;
  const isReady=!!membership?.ready;
  const canEdit=!isReady;
  const uniqueCount=new Set(selected).size;
  const goalkeeper=playerMap.get(starters[0]);

  function setStarter(index,value){
    setStarters(old=>old.map((id,i)=>i===index?value:id));
  }
  function setReserve(index,value){
    setBench(old=>old.map((id,i)=>i===index?value:id));
  }
  function optionsFor(current){
    return players.filter(p=>p.id===current||!selected.includes(p.id));
  }
  async function save(){
    setError('');setMessage('');
    if(starters.some(id=>!id)){setError('Escolha os 11 titulares.');return;}
    if(!goalkeeper||(goalkeeper.posicao||'').toLowerCase().indexOf('goleiro')===-1){setError('O primeiro titular precisa ser um goleiro.');return;}
    if(uniqueCount!==selected.length){setError('Não repita jogadores entre titulares e reservas.');return;}
    if(players.length<11){setError('Seu elenco precisa ter pelo menos 11 jogadores profissionais.');return;}
    setSaving(true);
    const {error:rpcError}=await supabase.rpc('save_mfo_room_lineup',{
      p_room_id:room.id,p_formation:formation,p_tactical_style:style,p_mentality:mentality,
      p_starters:starters,p_bench:bench.filter(Boolean)
    });
    setSaving(false);
    if(rpcError){setError(rpcError.message);return;}
    setHasSaved(true);
    setMessage('Escalação e tática salvas na sala. Agora você pode confirmar que está pronto.');
  }

  if(!membership||membership.role!=='coach')return <section style={styles.panel}><span style={styles.eyebrow}>PRÉ-JOGO</span><h3>Preparação dos treinadores</h3><p style={styles.muted}>Os treinadores estão montando suas equipes. Como espectador, você poderá acompanhar a preparação.</p></section>;
  if(loading)return <section style={styles.panel}><p style={styles.muted}>Carregando elenco e escalação...</p></section>;

  return <section style={{...styles.panel,display:'grid',gap:14}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'center'}}>
      <div><span style={styles.eyebrow}>PRÉ-JOGO • SUA EQUIPE</span><h3 style={{margin:'6px 0'}}>Montagem da escalação</h3><p style={styles.muted}>Selecione 11 titulares, até 7 reservas e defina o plano tático.</p></div>
      <span style={{background:isReady?'#124b35':'#26364d',padding:'7px 10px',borderRadius:8,fontSize:11,fontWeight:800,color:isReady?'#8df0ba':'#dbe7f5'}}>{isReady?'ESCALAÇÃO CONFIRMADA':'EM PREPARAÇÃO'}</span>
    </div>
    {error&&<div role="alert" style={{background:'#3a1e25',color:'#fecaca',padding:10,borderRadius:8,fontSize:12}}>{error}</div>}
    {message&&<div role="status" style={{background:'#123d32',color:'#b9f6d3',padding:10,borderRadius:8,fontSize:12}}>{message}</div>}
    {opponentReady&&<div style={{background:'#332b18',border:'1px solid #8b6b2c',padding:11,borderRadius:9,fontSize:12,color:'#f8e7b0'}}>{isReady?'Os dois treinadores confirmaram. As escalações estão bloqueadas.':'O adversário já confirmou. Você ainda pode concluir e confirmar sua escalação.'}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
      <label style={styles.muted}>Formação<select disabled={!canEdit} style={{...styles.input,marginTop:5}} value={formation} onChange={e=>setFormation(e.target.value)}>{FORMATIONS.map(f=><option key={f}>{f}</option>)}</select></label>
      <label style={styles.muted}>Estilo de jogo<select disabled={!canEdit} style={{...styles.input,marginTop:5}} value={style} onChange={e=>setStyle(e.target.value)}><option value="defensive">Defensivo</option><option value="balanced">Equilibrado</option><option value="offensive">Ofensivo</option></select></label>
      <label style={styles.muted}>Mentalidade<select disabled={!canEdit} style={{...styles.input,marginTop:5}} value={mentality} onChange={e=>setMentality(e.target.value)}><option value="very_defensive">Muito defensiva</option><option value="defensive">Defensiva</option><option value="normal">Normal</option><option value="offensive">Ofensiva</option><option value="very_offensive">Muito ofensiva</option></select></label>
    </div>
    {players.length<11?<p style={styles.muted}>Seu clube ainda não tem 11 jogadores profissionais disponíveis.</p>:<>
      <div>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',marginBottom:8}}><strong>Titulares</strong><span style={styles.muted}>{starters.filter(Boolean).length}/11 • Goleiro na primeira vaga</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:8}}>
          {starters.map((id,index)=><label key={index} style={styles.muted}>{index===0?'Goleiro': 'Titular '+(index+1)}
            <select disabled={!canEdit} style={{...styles.input,marginTop:4}} value={id} onChange={e=>setStarter(index,e.target.value)}>
              <option value="">Selecionar jogador</option>
              {optionsFor(id).filter(p=>index!==0||(p.posicao||'').toLowerCase().includes('goleiro')).map(p=><option key={p.id} value={p.id}>{p.nome} • {p.posicao||'—'} • OVR {p.overall??'—'}{p.is_star?' ★':''}</option>)}
            </select>
          </label>)}
        </div>
      </div>
      <div>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',marginBottom:8}}><strong>Banco de reservas</strong><span style={styles.muted}>{bench.filter(Boolean).length}/7</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:8}}>
          {bench.map((id,index)=><label key={index} style={styles.muted}>Reserva {index+1}
            <select disabled={!canEdit} style={{...styles.input,marginTop:4}} value={id} onChange={e=>setReserve(index,e.target.value)}>
              <option value="">— Vaga vazia —</option>
              {optionsFor(id).map(p=><option key={p.id} value={p.id}>{p.nome} • {p.posicao||'—'} • OVR {p.overall??'—'}{p.is_star?' ★':''}</option>)}
            </select>
          </label>)}
        </div>
      </div>
    </>}
    <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
      <button type="button" style={styles.button} disabled={!canEdit||saving||players.length<11} onClick={save}>{saving?'Salvando...':'Salvar escalação'}</button>
      {!isReady&&<button type="button" style={{...styles.button,background:'#225b8a'}} disabled={!hasSaved||saving} onClick={async()=>{setError('');const {error:e}=await supabase.rpc('set_mfo_room_ready',{p_room_id:room.id,p_ready:true});if(e)setError(e.message);else setMessage('Escalação confirmada! Aguardando o outro treinador.');}}>{hasSaved?'Confirmar escalação':'Salve a escalação para confirmar'}</button>}
      {isReady&&(!opponentReady||!opponentLineup||!hasSaved)&&<button type="button" style={{...styles.button,background:'#8a5a22'}} onClick={async()=>{const {error:e}=await supabase.rpc('set_mfo_room_ready',{p_room_id:room.id,p_ready:false});if(e)setError(e.message);else setMessage('Confirmação retirada. Você pode ajustar sua escalação novamente.');}}>Reabrir escalação</button>}
      {isReady&&opponentReady&&opponentLineup&&hasSaved&&<span style={styles.muted}>Os dois treinadores estão prontos. A sala está aguardando a etapa de início da partida.</span>}
    </div>
    {opponent&&<div style={{borderTop:'1px solid #263b32',paddingTop:12}}>
      <strong style={{fontSize:13}}>Adversário</strong>
      <p style={styles.muted}>{opponentReady?'Escalação confirmada.':'Preparando a equipe...' } {opponentLineup?.formation?'Formação: '+opponentLineup.formation:''}</p>
    </div>}
  </section>;
}
