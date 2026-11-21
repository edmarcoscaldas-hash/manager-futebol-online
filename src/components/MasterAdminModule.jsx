import { useCallback, useEffect, useMemo, useState } from 'react';
import FileRosterImportModule from './FileRosterImportModule.jsx';

export default function MasterAdminModule({ supabase }) {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showFileImport, setShowFileImport] = useState(false);

  const selected = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId]);

  const invoke = useCallback(async (payload) => {
    const { data, error: invokeError } = await supabase.functions.invoke('mfo-master-admin', { body: payload });
    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.detail || data.error);
    return data;
  }, [supabase]);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await invoke({ action: 'list_users' });
      setUsers(data.users ?? []);
      setSelectedId((current) => current && data.users?.some((u) => u.id === current) ? current : (data.users?.find((u) => !u.is_master)?.id ?? ''));
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os usuários.');
    } finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const runAction = async (action) => {
    if (!selected) return;
    if (action === 'reset_complete_individual') {
      const accepted = window.confirm(
        'CONFIRMAÇÃO DE RESET COMPLETO\n\nSerão apagados a carreira, o clube e todos os dados de jogo deste usuário. A conta e o login serão mantidos. Os demais usuários e dados globais serão preservados.\n\nDeseja continuar?'
      );
      if (!accepted) return;
      const typed = window.prompt('Para confirmar, digite RESETAR');
      if (typed !== 'RESETAR') { setNotice('Reset cancelado.'); return; }
    } else {
      const label = action === 'block_user' ? 'bloquear' : 'desbloquear';
      if (!window.confirm(`Confirma ${label} o acesso de ${selected.email}?`)) return;
    }
    setWorking(true); setError(''); setNotice('');
    try {
      const data = await invoke({
        action,
        target_user_id: selected.id,
        ...(action === 'reset_complete_individual' ? { confirm_reset: true } : {}),
      });
      if (action === 'reset_complete_individual') {
        setNotice('Reset completo concluído. A conta foi mantida e pode iniciar uma nova carreira.');
      } else {
        setNotice(action === 'block_user' ? 'Usuário bloqueado.' : 'Acesso do usuário liberado.');
      }
      await loadUsers();
    } catch (e) {
      setError(e.message || 'A ação não foi concluída.');
    } finally { setWorking(false); }
  };

  const date = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Nunca acessou';

  if (showFileImport) return <div style={{ color: '#f8fafc' }}>
    <button onClick={() => setShowFileImport(false)} style={{ ...buttonStyle, marginBottom: 16 }}>← Voltar ao Painel Master</button>
    <FileRosterImportModule supabase={supabase} />
  </div>;

  return (
    <div style={{ color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#67e8a5', fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>ACESSO RESTRITO</span>
          <h2 style={{ margin: '8px 0' }}>Painel Master</h2>
          <p style={{ color: '#a7b3c5', margin: 0 }}>Controle de cadastros, acessos e dados de jogo dos participantes.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowFileImport(true)} style={buttonStyle}>Central de Importação de Elencos</button>
          <button onClick={loadUsers} disabled={loading || working} style={buttonStyle}>{loading ? 'Atualizando...' : 'Atualizar dados'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '20px 0' }}>
        <Metric label="CADASTROS" value={users.length} />
        <Metric label="ACESSOS BLOQUEADOS" value={users.filter((u) => u.blocked).length} />
        <Metric label="CLUBES DE USUÁRIOS" value={users.reduce((sum, u) => sum + u.clubs_count, 0)} />
        <Metric label="CARREIRAS" value={users.reduce((sum, u) => sum + u.careers_count, 0)} />
      </div>

      {error && <p style={{ background: '#3a1e25', color: '#fecaca', padding: 12, borderRadius: 8 }}>{error}</p>}
      {notice && <p style={{ background: '#123d32', color: '#bbf7d0', padding: 12, borderRadius: 8 }}>{notice}</p>}

      <div style={{ overflowX: 'auto', border: '1px solid #34465f', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 13 }}>
          <thead><tr style={{ background: '#17263b', textAlign: 'left' }}>
            {['Usuário','Cadastro','Último acesso','Clubes','Carreiras','Status'].map((label) => <th key={label} style={{ padding: 11 }}>{label}</th>)}
          </tr></thead>
          <tbody>
            {users.map((u) => <tr key={u.id} onClick={() => setSelectedId(u.id)} style={{ background: selectedId === u.id ? '#1c3b34' : 'transparent', borderTop: '1px solid #26364d', cursor: 'pointer' }}>
              <td style={{ padding: 11 }}><strong>{u.nome || 'Sem nome'}</strong><div style={{ color: '#a7b3c5', marginTop: 3 }}>{u.email}</div>{u.is_master && <small style={{ color: '#facc15' }}>MASTER</small>}</td>
              <td style={{ padding: 11, whiteSpace: 'nowrap' }}>{date(u.created_at)}</td>
              <td style={{ padding: 11, whiteSpace: 'nowrap' }}>{date(u.last_sign_in_at)}</td>
              <td style={{ padding: 11 }}>{u.clubs_count}</td><td style={{ padding: 11 }}>{u.careers_count}</td>
              <td style={{ padding: 11, color: u.blocked ? '#fca5a5' : '#86efac' }}>{u.blocked ? 'Bloqueado' : 'Ativo'}</td>
            </tr>)}
            {!users.length && <tr><td colSpan="6" style={{ padding: 20, color: '#a7b3c5' }}>{loading ? 'Carregando...' : 'Nenhum cadastro encontrado.'}</td></tr>}
          </tbody>
        </table>
      </div>

      <section style={{ background: '#0b1220', border: '1px solid #34465f', borderRadius: 12, padding: 18, marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Ações do usuário selecionado</h3>
        {!selected ? <p style={{ color: '#a7b3c5' }}>Selecione um usuário na tabela acima.</p> : <>
          <p style={{ color: '#a7b3c5' }}><strong style={{ color: '#f8fafc' }}>{selected.nome || selected.email}</strong> · {selected.email}</p>
          {selected.is_master ? <p style={{ color: '#facc15' }}>A conta master está protegida contra bloqueio e reset.</p> : <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <button disabled={working} onClick={() => runAction(selected.blocked ? 'unblock_user' : 'block_user')} style={buttonStyle}>
              {selected.blocked ? 'Liberar acesso' : 'Bloquear acesso'}
            </button>
            <button disabled={working} onClick={() => runAction('reset_complete_individual')} style={{ ...buttonStyle, background: '#7f1d1d' }}>
              {working ? 'Processando...' : 'Reset completo individual'}
            </button>
          </div>}
          <p style={{ color: '#8291a6', fontSize: 12, marginBottom: 0 }}>O reset mantém a conta do usuário, mas remove sua carreira, clube e dados de jogo vinculados. Não afeta outros participantes.</p>
        </>}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={{ background: '#0b1220', border: '1px solid #34465f', borderRadius: 10, padding: 14 }}>
    <div style={{ color: '#8291a6', fontSize: 10, letterSpacing: 1.2, fontWeight: 700 }}>{label}</div>
    <div style={{ color: '#67e8a5', fontSize: 25, fontWeight: 700, marginTop: 6 }}>{value}</div>
  </div>;
}

const buttonStyle = { background: '#176b4b', color: '#fff', border: 0, borderRadius: 8, padding: '11px 15px', cursor: 'pointer', fontWeight: 700 };
