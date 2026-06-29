import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // タスク関連のstate
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskError, setTaskError] = useState('');

  const navigate = useNavigate();

  // 現場情報の取得
  useEffect(() => {
    client.get(`/api/projects/${id}`).then(res => {
      const p = res.data.project ?? res.data;
      setProject(p);
      setName(p.name);
      setLocation(p.location || '');
      setStartDate(p.start_date ? p.start_date.slice(0, 10) : '');
    }).catch(() => {
      setError('現場情報の取得に失敗しました');
    });
  }, [id]);

  // タスク一覧の取得
  useEffect(() => {
    fetchTasks();
  }, [id]);

  const fetchTasks = () => {
    client.get(`/api/projects/${id}/tasks`)
      .then(res => {
        const data = res.data;
        setTasks(Array.isArray(data) ? data : []);
      })
      .catch(() => setTaskError('タスクの取得に失敗しました'));
  };

  // 現場情報の更新
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await client.put(`/api/projects/${id}`, { name, location, start_date: startDate });
      setSuccess('現場情報を更新しました');
    } catch (err) {
      setError('更新に失敗しました。しばらくしてから再試行してください');
    }
  };

  // 現場の削除
  const handleDelete = async () => {
    if (!window.confirm(`「${name}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    try {
      await client.delete(`/api/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setError('削除に失敗しました。しばらくしてから再試行してください');
    }
  };

  // タスクの追加
  const handleAddTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    try {
      await client.post(`/api/projects/${id}/tasks`, {
        title: newTaskTitle,
        due_date: newTaskDueDate || null,
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      fetchTasks();
    } catch (err) {
      setTaskError('タスクの追加に失敗しました');
    }
  };

  // タスクのステータス切り替え（pending ↔ done）
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      await client.put(`/api/tasks/${task.id}`, { status: nextStatus });
      setTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t)
      );
    } catch (err) {
      setTaskError('ステータスの更新に失敗しました');
    }
  };

  // タスクの削除
  const handleDeleteTask = async (taskId) => {
    try {
      await client.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setTaskError('タスクの削除に失敗しました');
    }
  };

  if (!project) return <p className="loading">読み込み中...</p>;

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks    = tasks.filter(t => t.status === 'done');

  return (
    <>
      <header className="app-header">
        <span className="header-title">建築工事工程管理システム</span>
      </header>

      <div className="page-container-narrow">
        {/* ---- 現場情報 ---- */}
        <div className="page-header">
          <h1 className="page-title">現場詳細・編集</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
            ← 一覧に戻る
          </button>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          {error   && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">現場名 <span style={{ color: '#c0392b' }}>*</span></label>
              <input type="text" className="form-input" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">場所</label>
              <input type="text" className="form-input" value={location}
                onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">開始日</label>
              <input type="date" className="form-input" value={startDate}
                onChange={e => setStartDate(e.target.value)} />
            </div>
            <hr className="divider" />
            <div className="btn-group">
              <button type="submit" className="btn btn-primary">更新する</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>削除</button>
            </div>
          </form>
        </div>

        {/* ---- タスク管理 ---- */}
        <h2 className="page-title" style={{ fontSize: 16 }}>タスク一覧</h2>

        <div className="card">
          {taskError && <div className="error-message">{taskError}</div>}

          {/* タスク追加フォーム */}
          <form onSubmit={handleAddTask} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: 160 }}
                placeholder="タスク名を入力"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                required
              />
              <input
                type="date"
                className="form-input"
                style={{ width: 148 }}
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">追加</button>
            </div>
          </form>

          <hr className="divider" style={{ margin: '0 0 16px' }} />

          {/* 未完了タスク */}
          {pendingTasks.length === 0 && doneTasks.length === 0 ? (
            <p className="empty-message">タスクがまだありません</p>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <ul className="task-list">
                  {pendingTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleStatus}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </ul>
              )}

              {/* 完了済みタスク */}
              {doneTasks.length > 0 && (
                <>
                  <p className="task-section-label">完了済み（{doneTasks.length}件）</p>
                  <ul className="task-list task-list--done">
                    {doneTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggleStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ---- タスク1件のUIコンポーネント ----
function TaskItem({ task, onToggle, onDelete }) {
  const isDone = task.status === 'done';
  return (
    <li className={`task-item${isDone ? ' task-item--done' : ''}`}>
      <label className="task-check-label">
        <input
          type="checkbox"
          className="task-checkbox"
          checked={isDone}
          onChange={() => onToggle(task)}
        />
        <span className="task-title">{task.title}</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {task.due_date && (
          <span className="task-due">{task.due_date.slice(0, 10)}</span>
        )}
        <button
          className="btn-task-delete"
          onClick={() => onDelete(task.id)}
          title="削除"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export default ProjectDetail;
