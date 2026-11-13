import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const FORMATIONS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2'];

const FORMATION_ROLES = {
  '4-4-2': [['Goleiro'],['Lateral'],['Zagueiro'],['Zagueiro'],['Lateral'],['Volante','Meia'],['Volante','Meia'],['Meia','Ponta'],['Meia','Ponta'],['Atacante','Ponta'],['Atacante','Ponta']],
  '4-3-3': [['Goleiro'],['Lateral'],['Zagueiro'],['Zagueiro'],['Lateral'],['Volante'],['Meia','Volante'],['Meia'],['Ponta'],['Atacante','Ponta'],['Ponta']],
  '4-2-3-1': [['Goleiro'],['Lateral'],['Zagueiro'],['Zagueiro'],['Lateral'],['Volante'],['Volante','Meia'],['Ponta','Meia'],['Meia'],['Ponta','Meia'],['Atacante']],
  '3-5-2': [['Goleiro'],['Zagueiro'],['Zagueiro'],['Zagueiro'],['Lateral','Ponta'],['Volante'],['Meia','Volante'],['Meia'],['Lateral','Ponta'],['Atacante'],['Atacante']],
  '5-3-2': [['Goleiro'],['Lateral'],['Zagueiro'],['Zagueiro'],['Zagueiro'],['Lateral'],['Volante','Meia'],['Meia'],['Meia','Volante'],['Atacante'],['Atacante']]
};
const RESERVE_ROLES = [['Goleiro'],['Lateral','Zagueiro'],['Zagueiro','Lateral'],['Volante','Meia'],['Meia','Volante'],['Atacante','Ponta'],['Ponta','Atacante']];
const autoPickLineup = (roster, formation, criterion) => {
  const remaining = [...roster];
  const pick = roles => {
    const ranked = remaining.map((p,index) => {
      const position = (p.posicao || '').toLowerCase();
      const fitIndex = roles.findIndex(role => position.includes(role.toLowerCase()));
      const fit = fitIndex === -1 ? 0 : (roles.length - fitIndex) * 8 + 18;
      const base = criterion === 'energy'
        ? (Number(p.energia ?? 100) * 2) + (Number(p.overall || 0) * 0.35)
        : (Number(p.overall || 0) * 2) + (Number(p.energia ?? 100) * 0.08);
      return {p,index,score:base+fit};
    }).sort((a,b)=>b.score-a.score || Number(b.p.overall||0)-Number(a.p.overall||0));
    const chosen = ranked[0]?.p;
    if (chosen) remaining.splice(remaining.findIndex(p=>p.id===chosen.id),1);
    return chosen?.id || '';
  };
  const starters = (FORMATION_ROLES[formation] || FORMATION_ROLES['4-3-3']).map(pick);
  const bench = RESERVE_ROLES.map(pick);
  return {starters,bench};
};

const FORMATION_POSITIONS = {
  '4-4-2': [{x:50,y:90},{x:15,y:70},{x:38,y:73},{x:62,y:73},{x:85,y:70},{x:15,y:48},{x:38,y:50},{x:62,y:50},{x:85,y:48},{x:38,y:24},{x:62,y:24}],
  '4-3-3': [{x:50,y:90},{x:15,y:70},{x:38,y:73},{x:62,y:73},{x:85,y:70},{x:28,y:49},{x:50,y:54},{x:72,y:49},{x:18,y:24},{x:50,y:20},{x:82,y:24}],
  '4-2-3-1': [{x:50,y:90},{x:15,y:70},{x:38,y:73},{x:62,y:73},{x:85,y:70},{x:38,y:55},{x:62,y:55},{x:18,y:34},{x:50,y:32},{x:82,y:34},{x:50,y:17}],
  '3-5-2': [{x:50,y:90},{x:25,y:72},{x:50,y:74},{x:75,y:72},{x:12,y:49},{x:32,y:53},{x:50,y:48},{x:68,y:53},{x:88,y:49},{x:38,y:23},{x:62,y:23}],
  '5-3-2': [{x:50,y:90},{x:10,y:68},{x:30,y:72},{x:50,y:74},{x:70,y:72},{x:90,y:68},{x:28,y:48},{x:50,y:53},{x:72,y:48},{x:38,y:24},{x:62,y:24}]
};
const styles = {
  panel:{background:'#102236',border:'1px solid #29445a',borderRadius:14,padding:18,marginTop:14},
  input:{width:'100%',background:'#0b1725',border:'1px solid #35516a',borderRadius:8,color:'#edf5ff',padding:'10px 11px',boxSizing:'border-box'},
  button:{background:'#176b4b',border:'1px solid #3b9b78',borderRadius:9,color:'#fff',padding:'10px 15px',cursor:'pointer',fontWeight:700},
  muted:{color:'#9bb0c2',fontSize:13}
};
const normalizeMentality = value => ({'Muito defensiva':'very_defensive','muito defensiva':'very_defensive','Defensiva':'defensive','defensiva':'defensive','Normal':'normal','Ofensiva':'offensive','ofensiva':'offensive','Muito ofensiva':'very_offensive','muito ofensiva':'very_offensive'}[value] || (['very_defensive','defensive','normal','offensive','very_offensive'].includes(value) ? value : 'normal'));
const normalizeTacticalStyle = value => ({'Equilibrado':'balanced','equilibrado':'balanced','Posse de bola':'balanced','posse de bola':'balanced','Contra-ataque':'defensive','contra-ataque':'defensive','Pressão alta':'offensive','pressão alta':'offensive','Jogo pelas laterais':'balanced','jogo pelas laterais':'balanced','Bolas longas':'defensive','bolas longas':'defensive'}[value] || (['defensive','balanced','offensive'].includes(value) ? value : 'balanced'));
const TACTICAL_STYLES = [{value:'defensive',label:'Defensivo'},{value:'balanced',label:'Equilibrado'},{value:'offensive',label:'Ofensivo'}];
const empty = {formation:'4-3-3',tactical_style:'balanced',mentality:'normal',captain_player_id:'',penalty_taker_player_id:'',free_kick_taker_player_id:'',corner_taker_player_id:'',starters:Array(11).fill(''),bench:Array(7).fill('')};

export default function TacticsModule({ club }) {
  const [players,setPlayers]=useState([]);
  const [criterion,setCriterion]=useState('overall');
  const [activeSlot,setActiveSlot]=useState(null);
  const [config,setConfig]=useState(empty);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    async function load(){
      if(!club?.id || !supabase){setLoading(false);return;}
      setLoading(true);setError('');
      const [roster,settings]=await Promise.all([
        supabase.from('players').select('id,nome,posicao,overall,energia,is_star,is_youth').eq('club_id',club.id).eq('is_youth',false).order('overall',{ascending:false}),
        supabase.from('club_tactical_settings').select('*').eq('club_id',club.id).maybeSingle()
      ]);
      if(!active)return;
      if(roster.error)setError('Não foi possível carregar o elenco: '+roster.error.message);
      else setPlayers(roster.data||[]);
      if(settings.error)setError('Não foi possível carregar as táticas: '+settings.error.message);
      else if(settings.data){
        const {data:stored}=await supabase.from('club_default_lineups').select('starters,bench').eq('club_id',club.id).maybeSingle();
        if(!active)return;
        setConfig({...empty,...settings.data,mentality:normalizeMentality(settings.data.mentality),tactical_style:normalizeTacticalStyle(settings.data.tactical_style),starters:Array.isArray(stored?.starters)?stored.starters:Array(11).fill(''),bench:Array.isArray(stored?.bench)?stored.bench:Array(7).fill('')});
      } else {
        const {data:stored}=await supabase.from('club_default_lineups').select('starters,bench').eq('club_id',club.id).maybeSingle();
        if(!active)return;
        if(stored)setConfig({...empty,starters:stored.starters||empty.starters,bench:stored.bench||empty.bench});
      }
      setLoading(false);
    }
    load();return()=>{active=false};
  },[club?.id]);

  const playerMap=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players]);
  const selected=[...config.starters,...config.bench].filter(Boolean);
  const pitchPositions = FORMATION_POSITIONS[config.formation] || FORMATION_POSITIONS['4-3-3'];
  const duplicates=selected.length!==new Set(selected).size;
  const update=(key,value)=>setConfig(old=>({...old,[key]:value}));
  const generateLineup=(formation=config.formation,mode=criterion)=>{
    const lineup=autoPickLineup(players,formation,mode);
    setConfig(old=>({...old,formation,starters:lineup.starters,bench:lineup.bench}));
    setMessage('Escalação montada automaticamente. Você pode ajustar qualquer jogador antes de salvar.');
    setError('');
  };
  const playerSelect=(value,onChange,exclude=[],source=players)=>(
    <select style={styles.input} value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Selecionar jogador</option>
      {source.filter(p=>p.id===value||!exclude.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nome} • {p.posicao||'Sem posição'} • OVR {p.overall} • EN {p.energia ?? 100}{p.is_star?' ★':''}</option>)}
    </select>
  );
  async function save(){
    setMessage('');setError('');
    if(!club?.id||!supabase){setError('É necessário estar conectado ao Supabase e selecionar um clube.');return;}
    const starters=config.starters.filter(Boolean);
    if(starters.length!==11){setError('Selecione os 11 titulares antes de salvar.');return;}
    if(duplicates){setError('Um jogador não pode ocupar duas vagas entre titulares e reservas.');return;}
    const selectedIds=new Set(selected);
    for(const id of [config.captain_player_id,config.penalty_taker_player_id,config.free_kick_taker_player_id,config.corner_taker_player_id]){
      if(id&&!selectedIds.has(id)){setError('Capitão e cobradores devem estar entre os titulares ou reservas.');return;}
    }
    setSaving(true);
    const settings={club_id:club.id,formation:config.formation,tactical_style:normalizeTacticalStyle(config.tactical_style),mentality:normalizeMentality(config.mentality),captain_player_id:config.captain_player_id||null,penalty_taker_player_id:config.penalty_taker_player_id||null,free_kick_taker_player_id:config.free_kick_taker_player_id||null,corner_taker_player_id:config.corner_taker_player_id||null};
    const [a,b]=await Promise.all([
      supabase.from('club_tactical_settings').upsert(settings,{onConflict:'club_id'}),
      supabase.from('club_default_lineups').upsert({club_id:club.id,starters:config.starters,bench:config.bench},{onConflict:'club_id'})
    ]);
    setSaving(false);
    if(a.error||b.error)setError('Falha ao salvar: '+(a.error?.message||b.error?.message));
    else setMessage('Tática e escalação padrão salvas com sucesso.');
  }

  if(loading)return <p style={styles.muted}>Carregando elenco e táticas...</p>;
  return <div className="mfo-tactics-layout">
    <style>{`
      .mfo-tactics-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.85fr);gap:14px;align-items:start}
      .mfo-tactics-layout>.mfo-tactics-intro,.mfo-tactics-layout>p,.mfo-tactics-layout>section:first-of-type{grid-column:1/-1}
      .mfo-tactics-config{grid-column:2;grid-row:2}
      .mfo-tactics-pitch{grid-column:1;grid-row:2 / span 4}
      .mfo-tactics-pitch>div[role="img"]{max-width:none!important;height:560px!important}
      .mfo-tactics-bench,.mfo-tactics-responsibilities{grid-column:2}
      .mfo-tactics-layout>div:last-child{grid-column:2;display:flex;flex-wrap:wrap}
      @media(max-width:900px){.mfo-tactics-layout{grid-template-columns:minmax(0,1fr)}.mfo-tactics-layout>*{grid-column:1!important;grid-row:auto!important}.mfo-tactics-pitch>div[role="img"]{height:480px!important}}
      @media(max-width:560px){.mfo-tactics-pitch>div[role="img"]{height:390px!important}}
    `}</style>
    <p className="mfo-tactics-intro" style={styles.muted}>Configure a equipe principal. A escalação padrão será usada como base para preparar cada partida.</p>
    {error&&<p style={{color:'#ff9c9c'}}>{error}</p>}
    {message&&<p style={{color:'#80e0b2'}}>{message}</p>}
    {players.length<11?<section style={styles.panel}><h3>Elenco insuficiente</h3><p style={styles.muted}>Você precisa ter pelo menos 11 jogadores profissionais no clube para montar a escalação.</p></section>:<>
      <section className="mfo-tactics-config" style={styles.panel}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <label style={styles.muted}>Formação<select style={styles.input} value={config.formation} onChange={e=>{setCriterion('overall');generateLineup(e.target.value,'overall')}}>{FORMATIONS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label style={styles.muted}>Critério de escalação<select style={styles.input} value={criterion} onChange={e=>setCriterion(e.target.value)}><option value="overall">Maior overall</option><option value="energy">Maior energia</option></select></label>
          <label style={styles.muted}>Estilo de jogo<select style={styles.input} value={config.tactical_style} onChange={e=>update('tactical_style',e.target.value)}>{TACTICAL_STYLES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label style={styles.muted}>Mentalidade<select style={styles.input} value={config.mentality} onChange={e=>update('mentality',e.target.value)}>{[{value:'very_defensive',label:'Muito defensiva'},{value:'defensive',label:'Defensiva'},{value:'normal',label:'Normal'},{value:'offensive',label:'Ofensiva'},{value:'very_offensive',label:'Muito ofensiva'}].map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        </div>
      </section>
      <section className="mfo-tactics-pitch" style={styles.panel}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <h3 style={{margin:0}}>Prévia tática • ${config.formation}</h3>
          <span style={styles.muted}>A posição dos jogadores segue a ordem dos titulares</span>
        </div>
        <div role="img" aria-label="Campo de futebol com a prévia da formação" style={{position:'relative',height:440,maxWidth:560,margin:'16px auto 0',overflow:'hidden',border:'2px solid #b6d7bd',borderRadius:12,background:'repeating-linear-gradient(0deg,#17613f 0px,#17613f 54px,#1b6b46 54px,#1b6b46 108px)'}}>
          <div style={{position:'absolute',inset:8,border:'1px solid rgba(255,255,255,.75)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',left:8,right:8,top:'50%',borderTop:'1px solid rgba(255,255,255,.75)'}}/>
          <div style={{position:'absolute',width:94,height:94,border:'1px solid rgba(255,255,255,.75)',borderRadius:'50%',left:'50%',top:'50%',transform:'translate(-50%,-50%)'}}/>
          <div style={{position:'absolute',width:'54%',height:58,border:'1px solid rgba(255,255,255,.75)',borderTop:0,left:'23%',top:8}}/>
          <div style={{position:'absolute',width:'54%',height:58,border:'1px solid rgba(255,255,255,.75)',borderBottom:0,left:'23%',bottom:8}}/>
          <div style={{position:'absolute',width:'20%',height:8,border:'1px solid rgba(255,255,255,.75)',borderBottom:0,left:'40%',top:8}}/>
          <div style={{position:'absolute',width:'20%',height:8,border:'1px solid rgba(255,255,255,.75)',borderTop:0,left:'40%',bottom:8}}/>
          {config.starters.map((id,i)=>{
            const p=playerMap.get(id);
            const point=pitchPositions[i];
            if(!point)return null;
            const roles = (FORMATION_ROLES[config.formation] || FORMATION_ROLES['4-3-3'])[i] || [];
            return <button key={i} type="button" onClick={()=>setActiveSlot(i)} title={p ? p.nome+' • '+p.overall : 'Escolher '+roles.join(' / ')} style={{position:'absolute',left:point.x+'%',top:point.y+'%',transform:'translate(-50%,-50%)',width:82,maxWidth:'20%',textAlign:'center',zIndex:2,background:'transparent',border:activeSlot===i?'2px solid #f5c542':'2px solid transparent',borderRadius:10,padding:2,cursor:'pointer',color:'#fff'}}>
              <div style={{width:34,height:34,margin:'0 auto 3px',display:'grid',placeItems:'center',borderRadius:'50%',background:p?'#f5c542':'#64748b',border:'2px solid #fff',color:'#172033',fontSize:12,fontWeight:900,boxShadow:'0 2px 8px #0008'}}>{p?.overall ?? '＋'}</div>
              <div style={{fontSize:10,fontWeight:800,color:'#fff',textShadow:'0 1px 3px #000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p?.nome || roles[0] || 'Vaga '+(i+1)}</div>
            </button>;
          })}
        </div>
        <p style={{...styles.muted,textAlign:'center',marginBottom:0}}>Clique em qualquer jogador ou posição no campo para escolher quem vai jogar ali.</p>
        {activeSlot!==null && <div style={{marginTop:14,background:'#0b1725',border:'1px solid #35516a',borderRadius:10,padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <strong>Escolher jogador • {(FORMATION_ROLES[config.formation] || FORMATION_ROLES['4-3-3'])[activeSlot]?.join(' / ')}</strong>
            <button type='button' onClick={()=>setActiveSlot(null)} style={{...styles.button,padding:'6px 10px'}}>Fechar</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8,marginTop:12}}>
            {players.filter(player=>{
              const roles=(FORMATION_ROLES[config.formation] || FORMATION_ROLES['4-3-3'])[activeSlot] || [];
              const pos=(player.posicao||'').toLowerCase();
              return roles.some(role=>pos.includes(role.toLowerCase())) && (!selected.includes(player.id) || player.id===config.starters[activeSlot]);
            }).sort((a,b)=>criterion==='energy' ? Number(b.energia??100)-Number(a.energia??100) || Number(b.overall||0)-Number(a.overall||0) : Number(b.overall||0)-Number(a.overall||0) || Number(b.energia??100)-Number(a.energia??100)).map(player=><button key={player.id} type='button' onClick={()=>{setConfig(old=>({...old,starters:old.starters.map((id,index)=>index===activeSlot?player.id:id)}));setActiveSlot(null);}} style={{...styles.input,textAlign:'left',cursor:'pointer'}}>{player.nome} • OVR {player.overall} • EN {player.energia??100}{player.is_star?' ★':''}</button>)}
            {players.filter(player=>{const roles=(FORMATION_ROLES[config.formation] || FORMATION_ROLES['4-3-3'])[activeSlot] || [];return roles.some(role=>(player.posicao||'').toLowerCase().includes(role.toLowerCase())) && (!selected.includes(player.id)||player.id===config.starters[activeSlot]);}).length===0 && <span style={styles.muted}>Não há outros jogadores disponíveis para esta posição.</span>}
          </div>
          {config.starters[activeSlot] && <button type='button' onClick={()=>{setConfig(old=>({...old,starters:old.starters.map((id,index)=>index===activeSlot?'':id)}));setActiveSlot(null);}} style={{...styles.button,marginTop:10,background:'#7a3030',borderColor:'#a34a4a'}}>Remover jogador da posição</button>}
        </div>}
      </section>
      <p style={styles.muted}>Titulares definidos: {config.starters.filter(Boolean).length}/11</p>
      <section className="mfo-tactics-bench" style={styles.panel}>
        <h3 style={{marginTop:0}}>Banco de reservas ({config.bench.filter(Boolean).length}/7)</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          {config.bench.map((id,i)=><label key={i} style={styles.muted}>Reserva {i+1}{playerSelect(id,v=>update('bench',config.bench.map((x,j)=>j===i?v:x)),selected.filter(x=>x!==id))}</label>)}
        </div>
      </section>
      <section className="mfo-tactics-responsibilities" style={styles.panel}>
        <h3 style={{marginTop:0}}>Responsáveis</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
          {[[ 'captain_player_id','Capitão'],['penalty_taker_player_id','Pênaltis'],['free_kick_taker_player_id','Faltas'],['corner_taker_player_id','Escanteios']].map(([key,label])=><label key={key} style={styles.muted}>{label}{playerSelect(config[key],v=>update(key,v),[],players.filter(p=>selected.includes(p.id)))}</label>)}
        </div>
      </section>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}><button style={styles.button} type="button" onClick={()=>generateLineup(config.formation,criterion)}>Montar automaticamente • {criterion==='energy'?'Energia':'Overall'}</button><button style={styles.button} disabled={saving} onClick={save}>{saving?'Salvando...':'Salvar tática e escalação'}</button></div>
    </>}
  </div>;
}
