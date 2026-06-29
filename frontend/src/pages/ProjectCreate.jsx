import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

function ProjectCreate() {
  const [name, setName]           = useState('');
  const [address, setAddress]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [status, setStatus]       = useState('planning');
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/api/projects', { name, address, start_date: startDate, end_date: endDate, status });
      navigate('/projects');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('現場の作成は管理者のみ可能です');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || '入力内容に不備があります');
      } else {
        setError('作成に失敗しました。しばらくしてから再試行してください');
      }
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">現場新規作成</h1>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">現場名 <span style={{ color: '#c0392b' }}>*</span></label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              required placeholder="例：〇〇ビル新築工事" />
          </div>
          <div className="form-group">
            <label className="form-label">現場住所</label>
            <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="例：東京都渋谷区〇〇1-2-3" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">工期開始日 <span style={{ color: '#c0392b' }}>*</span></label>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">工期終了日 <span style={{ color: '#c0392b' }}>*</span></label>
              <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="planning">計画中</option>
              <option value="in_progress">進行中</option>
              <option value="on_hold">保留</option>
              <option value="completed">完了</option>
            </select>
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
    </Layout>
  );
}

export default ProjectCreate;
