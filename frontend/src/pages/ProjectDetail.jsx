import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    client.get(`/api/projects/${id}`).then(res => {
      setProject(res.data);
      setName(res.data.name);
      setLocation(res.data.location || '');
      setStartDate(res.data.start_date || '');
    });
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    await client.put(`/api/projects/${id}`, { name, location, start_date: startDate });
    alert('更新しました');
  };

  const handleDelete = async () => {
    if (window.confirm('削除しますか？')) {
      await client.delete(`/api/projects/${id}`);
      navigate('/projects');
    }
  };

  if (!project) return <p>読み込み中...</p>;

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>現場詳細・編集</h2>
      <form onSubmit={handleUpdate}>
        <div>
          <label>現場名</label><br />
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <label>場所</label><br />
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <label>開始日</label><br />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <button type="submit" style={{ width: '100%' }}>更新</button>
      </form>
      <button onClick={handleDelete} style={{ width: '100%', marginTop: 12, color: 'red' }}>削除</button>
      <button onClick={() => navigate('/projects')} style={{ width: '100%', marginTop: 8 }}>一覧に戻る</button>
    </div>
  );
}

export default ProjectDetail;
