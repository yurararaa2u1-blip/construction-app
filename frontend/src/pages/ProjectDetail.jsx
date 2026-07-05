import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const canEditTask = user.role === 'admin' || user.role === 'supervisor';

  const [project, setProject]     = useState(null);
  const [name, setName]           = useState('');
  const [address, setAddress]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [status, setStatus]       = useState('planning');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [tasks, setTasks]               = useState([]);
  const [taskName, setTaskName]         = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd]     = useState('');
  const [taskError, setTaskError]       = useState('');

  useEffect(() => {
    client.get(`/api/projects/${id}`).then(res => {
      const p = res.data.project ?? res.data;
      setProject(p);
      setName(p.name);
      setAddress(p.address || '');
      setStartDate(p.start_date ? p.start_date.slice(0, 10) : '');
      setEndDate(p.end_date   ? p.end_date.slice(0, 10)   : '');
      setStatus(p.status || 'planning');
    }).catch(() => setError('現場情報の取得に失敗しました'));
  }, [id]);

  useEffect(() => { fetchTasks(); }, [id]);

  const fetchTasks = () => {
    client.get(`/api/projects/${id}/tasks`)
      .then(res => setTasks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTaskError('工程の取得に失敗しました'));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await client.patch(`/api/projects/${id}`, { name, address, start_date: startDate, end_date: endDate, status });
      setSuccess('現場情報を更新しました');
    } catch (err) {
      setError(err.response?.data?.message || '更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await client.delete(`/api/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || '削除に失敗しました');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    try {
      await client.post(`/api/projects/${id}/tasks`, {
        name: taskName, planned_start: plannedStart, planned_end: plannedEnd,
      });
      setTaskName(''); setPlannedStart(''); setPlannedEnd('');
      fetchTasks();
    } catch (err) {
      setTaskError(err.response?.data?.message || '工程の追加に失敗しました');
    }
  };

  const handleProgressChange = async (task, newProgress) => {
    try {
      const res = await client.patch(`/api/tasks/${task.id}`, { progress: Number(newProgress) });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch {
      setTaskError('進捗の更新に失敗しました');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await client.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setTaskError(err.response?.data?.message || '工程の削除に失敗しました');
    }
  };

  if (!project) return <Layout><p className="loading">読み込み中...</p></Layout>;

  return (
    <Layout>
      {/* ページヘッダー */}
      <div className="page-header">
        <h1 className="page-title">現場詳細・編集</h1>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate(`/projects/${id}/gantt`)}>
            工程を見る（ガントチャート）
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
            ← 一覧に戻る
          </button>
        </div>
      </div>

      {/* 現場情報フォーム */}
      <div className="card" style={{ marginBottom: 24 }}>
        {error   && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">現場名 <span style={{ color: '#c0392b' }}>*</span></label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">現場住所</label>
            <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">工期開始日</label>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">工期終了日</label>
              <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
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
          {isAdmin && (
            <>
              <hr className="divider" />
              <div className="btn-group">
                <button type="submit" className="btn btn-primary">更新する</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>削除</button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* 工程一覧 */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>工程一覧</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {taskError && <div className="error-message" style={{ margin: '12px 16px 0' }}>{taskError}</div>}

        {/* 工程追加フォーム（admin/supervisorのみ） */}
        {canEditTask && (
          <form onSubmit={handleAddTask} style={{ padding: '16px', borderBottom: '1px solid #eaedf0' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="text" className="form-input" style={{ flex: 2, minWidth: 140 }}
                placeholder="工程名（例：基礎工事）"
                value={taskName} onChange={e => setTaskName(e.target.value)} required />
              <input type="date" className="form-input" style={{ flex: 1, minWidth: 120 }}
                value={plannedStart} onChange={e => setPlannedStart(e.target.value)} required />
              <input type="date" className="form-input" style={{ flex: 1, minWidth: 120 }}
                value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} required />
              <button type="submit" className="btn btn-primary">追加</button>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>予定開始日 〜 予定完了日</p>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="empty-message">工程がまだありません</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>工程名</th>
                <th>予定完了日</th>
                <th>進捗</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onProgressChange={handleProgressChange}
                  onDelete={handleDeleteTask}
                  canEditTask={canEditTask}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

function TaskRow({ task, onProgressChange, onDelete, canEditTask, isAdmin }) {
  const [progress, setProgress] = useState(task.progress);

  const handleBlur = () => {
    if (Number(progress) !== task.progress) onProgressChange(task, progress);
  };

  const isDelayed = task.is_delayed;

  return (
    <tr style={isDelayed ? { background: '#fff8f8' } : {}}>
      <td data-label="工程名">
        {isDelayed && <span style={{ color: '#c0392b', fontSize: 11, marginRight: 4 }}>●</span>}
        {task.name}
      </td>
      <td data-label="予定完了日">{task.planned_end ? task.planned_end.slice(0, 10) : '—'}</td>
      <td data-label="進捗" style={{ minWidth: 120 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" min="0" max="100"
            value={progress}
            onChange={e => setProgress(e.target.value)}
            onBlur={handleBlur}
            disabled={!canEditTask}
            style={{
              width: 52, padding: '4px 6px',
              border: '1px solid #ccd0d5', borderRadius: 4, fontSize: 13,
              background: canEditTask ? '#fff' : '#f0f0f0',
              cursor: canEditTask ? 'text' : 'not-allowed',
            }}
          />
          <span style={{ fontSize: 12, color: '#555' }}>%</span>
        </div>
      </td>
      <td data-label="状態">
        {task.progress >= 100 ? (
          <span style={{ color: '#27ae60', fontWeight: 700, fontSize: 12 }}>完了</span>
        ) : isDelayed ? (
          <span style={{ color: '#c0392b', fontWeight: 700, fontSize: 12 }}>遅延中</span>
        ) : task.progress > 0 ? (
          <span style={{ color: '#2980b9', fontWeight: 700, fontSize: 12 }}>進行中</span>
        ) : (
          <span style={{ color: '#888', fontSize: 12 }}>未着工</span>
        )}
      </td>
      <td>
        {isAdmin && (
          <button className="btn-task-delete" onClick={() => onDelete(task.id)} title="削除">✕</button>
        )}
      </td>
    </tr>
  );
}

export default ProjectDetail;
