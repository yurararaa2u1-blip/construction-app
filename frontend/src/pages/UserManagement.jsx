import { useEffect, useState } from 'react';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

const ROLE_LABEL = { admin: '管理者', supervisor: '現場監督', viewer: '閲覧のみ' };

function UserManagement() {
  const [users,   setUsers]   = useState([]);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = () => {
    client.get('/api/users')
      .then(res => setUsers(res.data.users || []))
      .catch(err => {
        if (err.response?.status === 403) setError('この画面はadminのみ表示できます');
        else setError('ユーザー一覧の取得に失敗しました');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    setError(''); setSuccess('');
    try {
      await client.patch(`/api/users/${userId}/role`, { role: newRole });
      setSuccess('ロールを変更しました');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'ロールの変更に失敗しました');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`「${user.name}」を削除しますか？`)) return;
    setError(''); setSuccess('');
    try {
      await client.delete(`/api/users/${user.id}`);
      setSuccess('ユーザーを削除しました');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || '削除に失敗しました');
    }
  };

  // サマリー
  const countByRole = (role) => users.filter(u => u.role === role).length;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">ユーザー管理</h1>
      </div>

      {/* サマリー */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="summary-card">
          <div className="summary-card-label">総ユーザー</div>
          <div className="summary-card-value">{users.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">管理者</div>
          <div className="summary-card-value">{countByRole('admin')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">現場監督</div>
          <div className="summary-card-value">{countByRole('supervisor')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">閲覧のみ</div>
          <div className="summary-card-value">{countByRole('viewer')}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error   && <div className="error-message"   style={{ margin: '16px 16px 0' }}>{error}</div>}
        {success && <div className="success-message" style={{ margin: '16px 16px 0' }}>{success}</div>}

        {loading ? (
          <p className="loading">読み込み中...</p>
        ) : users.length === 0 ? (
          <p className="empty-message">ユーザーが見つかりません</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>氏名</th>
                <th>メールアドレス</th>
                <th>役割</th>
                <th>登録日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ cursor: 'default' }}>
                  <td data-label="氏名" style={{ fontWeight: 600 }}>
                    {u.name}
                    {u.id === me.id && (
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>(自分)</span>
                    )}
                  </td>
                  <td data-label="メール">{u.email}</td>
                  <td data-label="役割">
                    {u.id === me.id ? (
                      <span className={`role-badge role-${u.role}`}>{ROLE_LABEL[u.role]}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: 13, width: 'auto' }}
                      >
                        <option value="admin">管理者</option>
                        <option value="supervisor">現場監督</option>
                        <option value="viewer">閲覧のみ</option>
                      </select>
                    )}
                  </td>
                  <td data-label="登録日">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ja-JP') : '—'}
                  </td>
                  <td>
                    {u.id !== me.id && (
                      <button
                        className="btn-task-delete"
                        onClick={() => handleDelete(u)}
                        title="削除"
                      >✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

export default UserManagement;
