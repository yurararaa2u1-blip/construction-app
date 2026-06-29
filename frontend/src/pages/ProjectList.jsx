import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

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
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>現場一覧</h2>
        <div>
          <Link to="/projects/new"><button>新規作成</button></Link>
          <button onClick={handleLogout} style={{ marginLeft: 8 }}>ログアウト</button>
        </div>
      </div>
      {projects.length === 0 ? (
        <p>現場がまだありません</p>
      ) : (
        <ul>
          {projects.map(p => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <Link to={`/projects/${p.id}`}>{p.name}</Link>　{p.location}　{p.start_date ? p.start_date.slice(0, 10) : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectList;
