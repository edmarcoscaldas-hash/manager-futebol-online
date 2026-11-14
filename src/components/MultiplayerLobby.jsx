import { useCallback, useEffect, useState } from 'react';

const panel = { background:'#0b1220', border:'1px solid #263b32', borderRadius:14, padding:18 };
const input = { width:'100%', boxSizing:'border-box', padding:12, borderRadius:9, border:'1px solid #34465f', background:'#07110d', color:'#fff', fontSize:14 };
const primary = { background:'#168653', color:'#fff', border:0, borderRadius:9, padding:'11px 15px', cursor:'pointer', fontWeight:700 };
const secondary = { background:'#26364d', color:'#fff', border:0, borderRadius:9, padding:'10px 14px', cursor:'pointer', fontWeight:700 };
const muted = { color:'#a7b3c5', fontSize:13, lineHeight:1.6 };
const eyebrow = { color:'#67e8a5', fontSize:11, letterSpacing:1.7, fontWeight:800 };

export default function MultiplayerLobby({ supabase, user, club }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [roomName, setRoomName] = useState('Desafio entre amigos');
  const [inviteCode, setInviteCode] = useState('');
  const [joinRole, setJoinRole] = useState('coach');
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshRooms = useCallback(async () => {
    if (!supabase || !user?.id) return;
    const { data: memberships, error: memberError } = await supabase
      .from('mfo_room_members')
      .select('room_id,role,ready,club_id')
      .eq('user_id', user.id);
    if (memberError) { setError(memberError.message); return; }
    const ids = (memberships || []).map(item => item.room_id);
    if (!ids.length) { setRooms([]); return; }
    const { data, error: roomError } = await supabase
      .from('mfo_rooms')
      .select('id,name,invite_code,status,created_at,created_by,max_participants')
      .in('id', ids)
      .order('created_at', { ascending:false });
    if (roomError) { setError(roomError.message); return; }
    setRooms(data || []);
  }, [supabase, user?.id]);

  const loadRoom = useCallback(async (roomId) => {
    if (!supabase || !roomId) return;
    setRoomLoading(true);
    const [roomRes, memberRes, messageRes] = await Promise.all([
      supabase.from('mfo_rooms').select('*').eq('id', roomId).single(),
      supabase.from('mfo_room_members').select('id,user_id,role,club_id,ready,joined_at').eq('room_id', roomId).order('joined_at'),
      supabase.from('mfo_room_messages').select('id,user_id,message,created_at').eq('room_id', roomId).order('created_at', { ascending:true }).limit(100)
    ]);
    if (roomRes.error || memberRes.error || messageRes.error) {
      setError((roomRes.error || memberRes.error || messageRes.error).message);
      setRoomLoading(false);
      return;
    }
    setActiveRoom(roomRes.data);
    setMembers(memberRes.data || []);
    setMessages(messageRes.data || []);
    setRoomLoading(false);
  }, [supabase]);

  useEffect(() => { refreshRooms(); }, [refreshRooms]);

  useEffect(() => {
    if (!activeRoom?.id || !supabase) return undefined;
    const roomId = activeRoom.id;
    const channel = supabase.channel('mfo-lobby-' + roomId)
      .on('postgres_changes', { event:'*', schema:'public', table:'mfo_room_members', filter:'room_id=eq.' + roomId }, () => loadRoom(roomId))
      .on('postgres_changes', { event:'*', schema:'public', table:'mfo_room_messages', filter:'room_id=eq.' + roomId }, () => loadRoom(roomId))
      .on('postgres_changes', { event:'*', schema:'public', table:'mfo_rooms', filter:'id=eq.' + roomId }, () => loadRoom(roomId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRoom?.id, supabase, loadRoom]);

  async function createRoom(event) {
    event?.preventDefault();
    setError(''); setNotice('');
    if (!club?.id) { setError('Você precisa estar comandando um clube para criar uma sala como treinador.'); return; }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('create_mfo_room', {
      p_name: roomName,
      p_club_id: club.id
    });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.room_id) { setError('A sala foi criada, mas não consegui recuperar seus dados. Atualize a lista.'); return; }
    setInviteCode(created.invite_code || '');
    await refreshRooms();
    await loadRoom(created.room_id);
    setNotice('Sala criada! Compartilhe o código com seus amigos.');
  }

  async function joinRoom(event) {
    event?.preventDefault();
    setError(''); setNotice('');
    if (!inviteCode.trim()) { setError('Digite o código de convite.'); return; }
    if (joinRole === 'coach' && !club?.id) { setError('Para entrar como treinador, primeiro assuma um clube.'); return; }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('join_mfo_room', {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_role: joinRole,
      p_club_id: joinRole === 'coach' ? club.id : null
    });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    await refreshRooms();
    await loadRoom(data);
    setNotice(joinRole === 'coach' ? 'Você entrou como treinador.' : 'Você entrou como espectador.');
  }

  async function changeReady(nextReady) {
    if (!activeRoom) return;
    setError(''); setNotice('');
    const { error: rpcError } = await supabase.rpc('set_mfo_room_ready', { p_room_id:activeRoom.id, p_ready:nextReady });
    if (rpcError) { setError(rpcError.message); return; }
    await loadRoom(activeRoom.id);
    setNotice(nextReady ? 'Você confirmou que está pronto.' : 'Sua confirmação foi retirada.');
  }

  async function leaveRoom() {
    if (!activeRoom) return;
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('leave_mfo_room', { p_room_id:activeRoom.id });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    setActiveRoom(null); setMembers([]); setMessages([]);
    await refreshRooms();
    setNotice('Você saiu da sala.');
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const message = chatText.trim();
    if (!message || !activeRoom || !user?.id) return;
    setChatText('');
    const { error: insertError } = await supabase.from('mfo_room_messages').insert({
      room_id:activeRoom.id, user_id:user.id, message
    });
    if (insertError) { setChatText(message); setError(insertError.message); }
  }

  async function copyCode() {
    if (!activeRoom?.invite_code) return;
    try {
      await navigator.clipboard.writeText(activeRoom.invite_code);
      setNotice('Código copiado. Envie para seus amigos.');
    } catch {
      setNotice('Código da sala: ' + activeRoom.invite_code);
    }
  }

  const myMembership = members.find(member => member.user_id === user?.id);
  const coachCount = members.filter(member => member.role === 'coach').length;
  const readyCount = members.filter(member => member.role === 'coach' && member.ready).length;
  const roomStatus = activeRoom?.status === 'waiting' ? 'AGUARDANDO' : activeRoom?.status === 'in_progress' ? 'EM ANDAMENTO' : 'FINALIZADA';

  return (
    <div style={{ display:'grid', gap:18 }}>
      <section style={{ ...panel, background:'linear-gradient(125deg,#123d32,#101d2b)', borderColor:'#285b49' }}>
        <span style={eyebrow}>MFO • MULTIPLAYER</span>
        <h2 style={{ margin:'9px 0 5px', color:'#fff' }}>Lobby de amistosos</h2>
        <p style={muted}>Crie uma sala privada, convide seus amigos e organize quem vai comandar cada clube ou acompanhar a partida.</p>
        <div style={{ display:'flex', gap:9, flexWrap:'wrap', marginTop:14 }}>
          <span style={{ background:'#071b13', border:'1px solid #285b49', borderRadius:8, padding:'7px 10px', fontSize:12 }}>Até 4 participantes</span>
          <span style={{ background:'#071b13', border:'1px solid #285b49', borderRadius:8, padding:'7px 10px', fontSize:12 }}>2 treinadores</span>
          <span style={{ background:'#071b13', border:'1px solid #285b49', borderRadius:8, padding:'7px 10px', fontSize:12 }}>Espectadores e chat</span>
        </div>
      </section>

      {error && <div role="alert" style={{ background:'#3a1e25', color:'#fecaca', padding:12, borderRadius:9, fontSize:13 }}>{error}</div>}
      {notice && <div role="status" style={{ background:'#123d32', color:'#b9f6d3', padding:12, borderRadius:9, fontSize:13 }}>{notice}</div>}

      {activeRoom ? (
        <section style={{ display:'grid', gap:14 }}>
          <div style={panel}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <div>
                <span style={eyebrow}>SALA PRIVADA • {roomStatus}</span>
                <h3 style={{ margin:'8px 0' }}>{activeRoom.name}</h3>
                <p style={muted}>Compartilhe o código para convidar até mais {Math.max(0, activeRoom.max_participants - members.length)} participante(s).</p>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button type="button" style={secondary} onClick={copyCode}>Código: {activeRoom.invite_code} ⧉</button>
                <button type="button" style={{ ...secondary, background:'#512b32' }} onClick={leaveRoom} disabled={loading}>Sair da sala</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))', gap:10, marginTop:16 }}>
              <div style={{ background:'#17263b', borderRadius:10, padding:13 }}><span style={eyebrow}>PARTICIPANTES</span><div style={{ fontSize:24, fontWeight:800, marginTop:5 }}>{members.length}/{activeRoom.max_participants}</div></div>
              <div style={{ background:'#17263b', borderRadius:10, padding:13 }}><span style={eyebrow}>TREINADORES</span><div style={{ fontSize:24, fontWeight:800, marginTop:5 }}>{coachCount}/2</div></div>
              <div style={{ background:'#17263b', borderRadius:10, padding:13 }}><span style={eyebrow}>CONFIRMADOS</span><div style={{ fontSize:24, fontWeight:800, marginTop:5 }}>{readyCount}/{coachCount}</div></div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14 }}>
            <div style={panel}>
              <span style={eyebrow}>PARTICIPANTES DA SALA</span>
              <div style={{ display:'grid', gap:10, marginTop:12 }}>
                {members.map((member,index) => (
                  <div key={member.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, background:'#17263b', borderRadius:9, padding:11 }}>
                    <div>
                      <strong style={{ fontSize:13 }}>{member.user_id === user?.id ? 'Você' : 'Treinador ' + (index + 1)}</strong>
                      <div style={{ ...muted, fontSize:11 }}>{member.role === 'coach' ? 'Técnico • ' + (member.club_id === club?.id ? club.nome : 'Clube definido') : 'Espectador'}</div>
                    </div>
                    <span style={{ color:member.role === 'coach' && member.ready ? '#67e8a5' : '#cbd5e1', fontSize:11, fontWeight:800 }}>{member.role === 'coach' ? (member.ready ? 'PRONTO' : 'PREPARANDO') : 'ASSISTINDO'}</span>
                  </div>
                ))}
                {members.length < activeRoom.max_participants && <div style={{ border:'1px dashed #40536d', borderRadius:9, padding:13, color:'#8492a6', fontSize:12 }}>Aguardando novos participantes…</div>}
              </div>
              {myMembership?.role === 'coach' && activeRoom.status === 'waiting' && (
                <button type="button" style={{ ...primary, width:'100%', marginTop:14 }} onClick={() => changeReady(!myMembership.ready)}>
                  {myMembership.ready ? 'Retirar confirmação' : 'Confirmar que estou pronto'}
                </button>
              )}
              <p style={{ ...muted, fontSize:11, marginTop:12 }}>A confirmação apenas registra que você terminou a preparação. O início da partida online será conectado na próxima etapa.</p>
            </div>

            <div style={{ ...panel, display:'flex', flexDirection:'column', minHeight:320 }}>
              <span style={eyebrow}>CHAT DA SALA</span>
              <div style={{ flex:1, minHeight:190, maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, margin:'12px 0' }}>
                {messages.length === 0 && <p style={muted}>Nenhuma mensagem ainda. Dê boas-vindas aos participantes!</p>}
                {messages.map(message => (
                  <div key={message.id} style={{ alignSelf:message.user_id === user?.id ? 'flex-end' : 'flex-start', maxWidth:'90%', background:message.user_id === user?.id ? '#155c3e' : '#17263b', borderRadius:10, padding:'8px 11px' }}>
                    <div style={{ fontSize:10, color:'#a7b3c5', marginBottom:3 }}>{message.user_id === user?.id ? 'Você' : 'Participante'} • {new Date(message.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                    <div style={{ fontSize:13, overflowWrap:'anywhere' }}>{message.message}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{ display:'flex', gap:7 }}>
                <input value={chatText} onChange={event=>setChatText(event.target.value)} maxLength={500} placeholder="Escreva uma mensagem…" style={input} />
                <button type="submit" style={primary} disabled={!chatText.trim()}>Enviar</button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
            <form onSubmit={createRoom} style={panel}>
              <span style={eyebrow}>NOVA PARTIDA</span>
              <h3 style={{ margin:'8px 0' }}>Criar sala privada</h3>
              <p style={muted}>Você será o primeiro treinador. Depois, compartilhe o código com o adversário e os espectadores.</p>
              <label style={{ display:'block', fontSize:12, margin:'14px 0 6px' }}>Nome da sala</label>
              <input value={roomName} onChange={event=>setRoomName(event.target.value)} minLength={3} maxLength={50} required style={input} />
              <div style={{ ...muted, fontSize:11, margin:'9px 0 13px' }}>Clube: <strong style={{ color:'#fff' }}>{club?.nome || 'Nenhum clube ativo'}</strong></div>
              <button type="submit" style={{ ...primary, width:'100%' }} disabled={loading || !club?.id}>{loading ? 'Criando sala…' : '＋ Criar sala'}</button>
            </form>

            <form onSubmit={joinRoom} style={panel}>
              <span style={eyebrow}>JÁ TEM UM CONVITE?</span>
              <h3 style={{ margin:'8px 0' }}>Entrar em uma sala</h3>
              <p style={muted}>Digite o código de 8 caracteres enviado pelo criador da sala.</p>
              <label style={{ display:'block', fontSize:12, margin:'14px 0 6px' }}>Código de convite</label>
              <input value={inviteCode} onChange={event=>setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8))} placeholder="Ex.: A1B2C3D4" maxLength={8} required style={{ ...input, letterSpacing:2, textTransform:'uppercase' }} />
              <label style={{ display:'block', fontSize:12, margin:'12px 0 6px' }}>Como deseja participar?</label>
              <select value={joinRole} onChange={event=>setJoinRole(event.target.value)} style={input}>
                <option value="coach">Treinador (comandar um clube)</option>
                <option value="spectator">Espectador (assistir e conversar)</option>
              </select>
              <button type="submit" style={{ ...primary, width:'100%', marginTop:13 }} disabled={loading || inviteCode.length !== 8}>{loading ? 'Entrando…' : 'Entrar na sala'}</button>
            </form>
          </div>

          <section style={panel}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div><span style={eyebrow}>SUAS SALAS</span><h3 style={{ margin:'7px 0 0' }}>Salas das quais você participa</h3></div>
              <button type="button" style={secondary} onClick={refreshRooms}>Atualizar lista</button>
            </div>
            {rooms.length === 0 ? <p style={muted}>Você ainda não participa de nenhuma sala. Crie uma ou entre usando um convite.</p> : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginTop:14 }}>
                {rooms.map(room => (
                  <button type="button" key={room.id} onClick={()=>loadRoom(room.id)} style={{ textAlign:'left', background:'#17263b', border:'1px solid #34465f', borderRadius:10, padding:14, color:'#fff' }}>
                    <span style={eyebrow}>{room.status === 'waiting' ? 'AGUARDANDO' : room.status === 'in_progress' ? 'EM ANDAMENTO' : 'FINALIZADA'}</span>
                    <div style={{ fontWeight:800, marginTop:7 }}>{room.name}</div>
                    <div style={{ color:'#a7b3c5', fontSize:11, marginTop:5 }}>Convite: {room.invite_code}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {roomLoading && <p style={muted}>Atualizando sala…</p>}
    </div>
  );
}
