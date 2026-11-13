import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const FORMATIONS = ['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2'];
const styles = {
  panel:{background:'#102236',border:'1px solid #29445a',borderRadius:14,padding:18,marginTop:14},
  input:{width:'100%',background:'#0b1725',border:'1px solid #35516a',borderRadius:8,color:'#edf5ff',padding:'10px 11px',boxSizing:'border-box'},
  button:{background:'#176b4b',border:'1px solid #3b9b78',borderRadius:9,color:'#fff',padding:'10px 15px',cursor:'pointer',fontWeight:700},
  muted:{color:'#9bb0c2',fontSize:13}
};
const empty = {formation:'4-3-3',tactical_style:'Equilibrado',mentality:'normal',captain_player_id:'',penalty_taker_player_id:'',free_kick_taker_player_id:'',corner_taker_player_id:'',starters:Array(11).fill(''),bench:Array(7).fill('')};

export default function TacticsModule({ club }) {
  const [players,setPlayers]=useState([]);
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
        supabase.from('players').select('id,nome,posicao,overall,is_star,is_youth').eq('club_id',club.id).eq('is_youth',false).order('overall',{ascending:false}),
        supabase.from('club_tactical_settings').select('*').eq('club_id',club.id).maybeSingle()
      ]);
      if(!active)return;
      if(roster.error)setError('Não foi possível carregar o elenco: '+roster.error.message);
      else setPlayers(roster.data||[]);
      if(settings.error)setError('Não foi possível carregar as táticas: '+settings.error.message);
      else if(settings.data){
        const {data:stored}=await supabase.from('club_default_lineups').select('starters,bench').eq('club_id',club.id).maybeSingle();
        if(!active)return;
        setConfig({...empty,...settings.data,starters:Array.isArray(stored?.starters)?stored.starters:Array(11).fill(''),bench:Array.isArray(stored?.bench)?stored.bench:Array(7).fill('')});
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
  const duplicates=selected.length!==new Set(selected).size;
  const update=(key,value)=>setConfig(old=>({...old,[key]:value}));
  const playerSelect=(value,onChange,exclude=[],source=players)=>(
    <select style={styles.input} value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Selecionar jogador</option>
      {source.filter(p=>p.id===value||!exclude.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.nome} • {p.posicao||'Sem posição'} • {p.overall}{p.is_star?' ★':''}</option>)}
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
    const settings={club_id:club.id,formation:config.formation,tactical_style:config.tactical_style,mentality:config.mentality,captain_player_id:config.captain_player_id||null,penalty_taker_player_id:config.penalty_taker_player_id||null,free_kick_taker_player_id:config.free_kick_taker_player_id||null,corner_taker_player_id:config.corner_taker_player_id||null};
    const [a,b]=await Promise.all([
      supabase.from('club_tactical_settings').upsert(settings,{onConflict:'club_id'}),
      supabase.from('club_default_lineups').upsert({club_id:club.id,starters:config.starters,bench:config.bench},{onConflict:'club_id'})
    ]);
    setSaving(false);
    if(a.error||b.error)setError('Falha ao salvar: '+(a.error?.message||b.error?.message));
    else setMessage('Tática e escalação padrão salvas com sucesso.');
  }

  if(loading)return <p style={styles.muted}>Carregando elenco e táticas...</p>;
  return <div>
    <p style={styles.muted}>Configure a equipe principal. A escalação padrão será usada como base para preparar cada partida.</p>
    {error&&<p style={{color:'#ff9c9c'}}>{error}</p>}
    {message&&<p style={{color:'#80e0b2'}}>{message}</p>}
    {players.length<11?<section style={styles.panel}><h3>Elenco insuficiente</h3><p style={styles.muted}>Você precisa ter pelo menos 11 jogadores profissionais no clube para montar a escalação.</p></section>:<>
      <section style={styles.panel}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <label style={styles.muted}>Formação<select style={styles.input} value={config.formation} onChange={e=>update('formation',e.target.value)}>{FORMATIONS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label style={styles.muted}>Estilo de jogo<select style={styles.input} value={config.tactical_style} onChange={e=>update('tactical_style',e.target.value)}>{['Equilibrado','Posse de bola','Contra-ataque','Pressão alta','Jogo pelas laterais','Bolas longas'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label style={styles.muted}>Mentalidade<select style={styles.input} value={config.mentality} onChange={e=>update('mentality',e.target.value)}>{[{value:'very_defensive',label:'Muito defensiva'},{value:'defensive',label:'Defensiva'},{value:'normal',label:'Normal'},{value:'offensive',label:'Ofensiva'},{value:'very_offensive',label:'Muito ofensiva'}].map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        </div>
      </section>
      <section style={styles.panel}>
        <h3 style={{marginTop:0}}>Time titular ({config.starters.filter(Boolean).length}/11)</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          {config.starters.map((id,i)=><label key={i} style={styles.muted}>Titular {i+1}{playerSelect(id,v=>update('starters',config.starters.map((x,j)=>j===i?v:x)),selected.filter(x=>x!==id))}</label>)}
        </div>
      </section>
      <section style={styles.panel}>
        <h3 style={{marginTop:0}}>Banco de reservas ({config.bench.filter(Boolean).length}/7)</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          {config.bench.map((id,i)=><label key={i} style={styles.muted}>Reserva {i+1}{playerSelect(id,v=>update('bench',config.bench.map((x,j)=>j===i?v:x)),selected.filter(x=>x!==id))}</label>)}
        </div>
      </section>
      <section style={styles.panel}>
        <h3 style={{marginTop:0}}>Responsáveis</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
          {[[ 'captain_player_id','Capitão'],['penalty_taker_player_id','Pênaltis'],['free_kick_taker_player_id','Faltas'],['corner_taker_player_id','Escanteios']].map(([key,label])=><label key={key} style={styles.muted}>{label}{playerSelect(config[key],v=>update(key,v),[],players.filter(p=>selected.includes(p.id)))}</label>)}
        </div>
      </section>
      <button style={styles.button} disabled={saving} onClick={save}>{saving?'Salvando...':'Salvar tática e escalação'}</button>
    </>}
  </div>;
}
