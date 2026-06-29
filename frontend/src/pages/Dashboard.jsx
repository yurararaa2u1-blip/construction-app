import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

const STATUS_LABEL = {
  planning:    '計画中',
  in_progress: '進行中',
  on_hold:     '保留',
  completed:   '完了',
};

const STATUS_BADGE = {
  planning:    'badge badge-planning',
  in_progress: 'badge badge-in_progress',
  on_hold:     'badge badge-on_hold',
  completed:   'badge badge-completed',
};

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/api/projects')
      .then(res => {
        const data = res.data;
        setProjects(Array.isArray(data) ? data : Array.isArray(data.projects) ? data.projects : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // サマリー計算
  const total      = projects.length;
  const delayed    = projects.filter(p => p.is_delayed).length;
  const completed  = projects.filter(p => p.status === 'completed').length;
  const avgProgress = total > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total)
    : 0;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
      </div>

      {/* サマリーカード */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">総現場数</div>
          <div className="summary-card-value">{total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">遅延中</div>
          <div className={`summary-card-value${delayed > 0 ? ' danger' : ''}`}>{delayed}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">完了</div>
          <div className="summary-card-value success">{completed}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">平均進捗</div>
          <div className="summary-card-value">{avgProgress}<span style={{ fontSize: 16, fontWeight: 400 }}>%</span></div>
        </div>
      </div>

      {/* 現場一覧テーブル */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #eaedf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', margin: 0 }}>現場一覧</h2>
          <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={() => navigate('/projects')}>
            すべて見る
          </button>
        </div>

        {loading ? (
          <p className="loading">読み込み中...</p>
        ) : projects.length === 0 ? (
          <p className="empty-message">現場がまだ登録されていません</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>現場名</th>
                <th>工期終了日</th>
                <th>進捗</th>
                <th>ステータス</th>
                <th>遅延</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                  <td data-label="現場名" style={{ fontWeight: 600 }}>{p.name}</td>
                  <td data-label="工期終了日">{p.end_date ? p.end_date.slice(0, 10) : '—'}</td>
                  <td data-label="進捗">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                      <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 4, height: 8 }}>
                        <div style={{
                          width: `${p.progress || 0}%`,
                          background: p.is_delayed ? '#c0392b' : '#1e3a5f',
                          height: 8,
                          borderRadius: 4,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>{p.progress || 0}%</span>
                    </div>
                  </td>
                  <td data-label="ステータス">
                    <span className={STATUS_BADGE[p.status] || 'badge'}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </td>
                  <td data-label="遅延">
                    {p.is_delayed && (
                      <span className="badge badge-delayed">遅延中</span>
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

export default Dashboard;
