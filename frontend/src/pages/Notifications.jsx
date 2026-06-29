import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

const TYPE_LABEL = { delay: '遅延アラート', reminder: 'リマインダー', info: 'お知らせ' };
const TYPE_TAG_CLASS = { delay: 'tag-delay', reminder: 'tag-reminder', info: 'tag-info' };

const TABS = [
  { key: 'all',    label: 'すべて' },
  { key: 'delay',  label: '遅延アラート' },
  { key: 'unread', label: '未読のみ' },
];

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [tab,           setTab]           = useState('all');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const navigate = useNavigate();

  const fetchNotifications = (currentTab) => {
    setLoading(true);
    let params = {};
    if (currentTab === 'delay')  params.type   = 'delay';
    if (currentTab === 'unread') params.unread = 'true';

    client.get('/api/notifications', { params })
      .then(res => setNotifications(res.data.notifications || []))
      .catch(() => setError('通知の取得に失敗しました'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(tab); }, [tab]);

  const handleTabChange = (key) => { setTab(key); };

  const handleMarkAsRead = async (n) => {
    if (n.is_read) {
      // 既に既読なら工程画面へ
      if (n.project_id) navigate(`/projects/${n.project_id}/gantt`);
      return;
    }
    try {
      await client.patch(`/api/notifications/${n.id}/read`);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      if (n.project_id) navigate(`/projects/${n.project_id}/gantt`);
    } catch {
      setError('既読の更新に失敗しました');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await client.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      setError('既読の更新に失敗しました');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatDate = (s) => {
    if (!s) return '';
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          通知
          {unreadCount > 0 && (
            <span style={{ marginLeft: 10, fontSize: 13, background: '#e74c3c', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              未読 {unreadCount}件
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAllAsRead}>
            すべて既読にする
          </button>
        )}
      </div>

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* フィルタータブ */}
        <div className="filter-tabs" style={{ padding: '0 16px' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`filter-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="loading">読み込み中...</p>
        ) : notifications.length === 0 ? (
          <p className="empty-message">通知はありません</p>
        ) : (
          <ul className="notification-list">
            {notifications.map(n => (
              <li
                key={n.id}
                className={`notification-item${!n.is_read ? ' unread' : ''}`}
                onClick={() => handleMarkAsRead(n)}
              >
                <div className={`notification-dot${n.is_read ? ' hidden' : ''}`} />
                <div className="notification-body">
                  <div className={`notification-type-tag ${TYPE_TAG_CLASS[n.type] || ''}`}>
                    {TYPE_LABEL[n.type] || n.type}
                  </div>
                  {n.project_name && (
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{n.project_name}</div>
                  )}
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-meta">{formatDate(n.sent_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

export default Notifications;
