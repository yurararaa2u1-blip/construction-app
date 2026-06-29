import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function ProjectCreate() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/api/projects', { name, location, start_date: startDate });
      navigate('/projects');
    } catch (err) {
      setError('作成に失敗しました');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>現場新規作成</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit" style={{ width: '100%' }}>作成</button>
      </form>
    </div>
  );
}

export default ProjectCreate;
