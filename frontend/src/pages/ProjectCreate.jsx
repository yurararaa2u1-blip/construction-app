import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

function ProjectCreate() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/api/projects', { name, location, start_date: startDate });
      navigate('/projects');
    } catch (err) {
      if (err.response?.status === 400) {
        setError('入力内容に不備があります。現場名は必須です');
      } else {
        setError('現場の作成に失敗しました。しばらくしてから再試行してください');
      }
    }
  };

  return (
    <>
      <header className="app-header">
        <span className="header-title">建築工事工程管理システム</span>
      </header>

      <div className="page-container-narrow">
        <div className="page-header">
          <h1 className="page-title">現場新規作成</h1>
        </div>

        <div className="card">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">現場名 <span style={{ color: '#c0392b' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="例：〇〇ビル新築工事"
              />
            </div>
            <div className="form-group">
              <label className="form-label">場所</label>
              <input
                type="text"
                className="form-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="例：東京都渋谷区〇〇"
              />
            </div>
            <div className="form-group">
              <label className="form-label">開始日</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <hr className="divider" />
            <div className="btn-group">
              <button type="submit" className="btn btn-primary">作成する</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/projects')}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default ProjectCreate;
