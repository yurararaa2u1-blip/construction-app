import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/api/projects').then(res => {
      const data = res.data;
      if (Array.isArray(data)) {
        setProjects(data);
      } else if (Array.isArray(data.projects)) {
        setProjects(data.projects);
      } else {
        setProjects([]);
      }
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      <header className="app-header">
        <span className="header-title">建築工事工程管理システム</span>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/projects/new')}>
            ＋ 新規作成
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">現場一覧</h1>
        </div>

        <div className="card">
          {projects.length === 0 ? (
            <p className="empty-message">現場がまだ登録されていません</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>現場名</th>
                  <th>場所</th>
                  <th>開始日</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                    <td data-label="現場名">{p.name}</td>
                    <td data-label="場所">{p.location || '—'}</td>
                    <td data-label="開始日">{p.start_date ? p.start_date.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

export default ProjectList;
