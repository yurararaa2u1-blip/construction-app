import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import '../styles.css';

// 日付間の日数差（d2 - d1 を日数で返す）
function daysDiff(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

// タイムラインの月ヘッダーを生成
function buildMonthSlots(startDate, totalDays) {
  const slots = [];
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  while (d <= endDate) {
    const mStart = d < startDate ? new Date(startDate) : new Date(d);
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0); // 月末
    const mEndClamped = mEnd > endDate ? new Date(endDate) : mEnd;

    const days   = daysDiff(mStart, mEndClamped) + 1;
    const offset = daysDiff(startDate, mStart);

    slots.push({
      label:        `${d.getFullYear()}/${d.getMonth() + 1}`,
      widthPercent: (days / totalDays) * 100,
      leftPercent:  (offset / totalDays) * 100,
    });

    d.setMonth(d.getMonth() + 1);
  }
  return slots;
}

function getBarClass(task) {
  if (task.progress >= 100)  return 'gantt-bar gantt-bar--completed';
  if (task.is_delayed)       return 'gantt-bar gantt-bar--delayed';
  if (task.progress > 0)     return 'gantt-bar gantt-bar--normal';
  return 'gantt-bar gantt-bar--not-started';
}

function GanttChart() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      client.get(`/api/projects/${id}`),
      client.get(`/api/projects/${id}/tasks`),
    ]).then(([pRes, tRes]) => {
      const p = pRes.data.project ?? pRes.data;
      setProject(p);
      setTasks(Array.isArray(tRes.data) ? tRes.data : []);
    }).catch(() => setError('データの取得に失敗しました'));
  }, [id]);

  const handleProgressChange = async (task, newProgress) => {
    try {
      const res = await client.patch(`/api/tasks/${task.id}`, { progress: Number(newProgress) });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch {
      setError('進捗の更新に失敗しました');
    }
  };

  if (error)    return <Layout><p className="error-message" style={{ margin: 24 }}>{error}</p></Layout>;
  if (!project) return <Layout><p className="loading">読み込み中...</p></Layout>;

  // タイムライン計算
  const tlStart   = new Date(project.start_date);
  const tlEnd     = new Date(project.end_date);
  const totalDays = Math.max(daysDiff(tlStart, tlEnd) + 1, 30); // 最低30日表示

  const today      = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = daysDiff(tlStart, today);
  const showToday   = todayOffset >= 0 && todayOffset < totalDays;

  const monthSlots = buildMonthSlots(tlStart, totalDays);

  // 遅延タスクのサマリー
  const delayedTasks = tasks.filter(t => t.is_delayed);

  return (
    <Layout>
      {/* ページヘッダー */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{project.name}</h1>
          <span style={{ fontSize: 13, color: '#666' }}>
            工期：{project.start_date?.slice(0, 10)} 〜 {project.end_date?.slice(0, 10)}
          </span>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/projects/${id}`)}>
          ← 現場詳細
        </button>
      </div>

      {/* 遅延アラート */}
      {delayedTasks.length > 0 && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {delayedTasks.map(t => (
            <div key={t.id}>
              ⚠ 「{t.name}」が予定より遅延しています（進捗 {t.progress}%）
            </div>
          ))}
        </div>
      )}

      {/* ガントチャート */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {tasks.length === 0 ? (
          <p className="empty-message">工程がまだ登録されていません</p>
        ) : (
          <div className="gantt-wrapper">
            <table className="gantt-table">
              <colgroup>
                <col className="gantt-name-col" />
                <col style={{ width: '100%' }} />
                <col className="gantt-th-progress" />
              </colgroup>
              <thead>
                <tr>
                  <th className="gantt-th-name">工程名</th>
                  <th className="gantt-th-timeline" style={{ padding: 0 }}>
                    {/* 月ヘッダー */}
                    <div className="gantt-month-row">
                      {monthSlots.map((m, i) => (
                        <div
                          key={i}
                          className="gantt-month-cell"
                          style={{ width: `${m.widthPercent}%` }}
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </th>
                  <th className="gantt-th-progress">進捗</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const startOffset = Math.max(0, daysDiff(tlStart, task.planned_start));
                  const duration    = Math.max(1, daysDiff(task.planned_start, task.planned_end) + 1);
                  const leftPct     = (startOffset / totalDays) * 100;
                  const widthPct    = Math.min((duration / totalDays) * 100, 100 - leftPct);

                  return (
                    <tr key={task.id}>
                      <td className={`gantt-td-name${task.is_delayed ? ' delayed' : ''}`}>
                        {task.is_delayed && (
                          <span style={{ color: '#c0392b', marginRight: 4, fontSize: 11 }}>●</span>
                        )}
                        {task.name}
                      </td>
                      <td className="gantt-td-timeline" style={{ position: 'relative' }}>
                        {/* 今日ライン */}
                        {showToday && (
                          <div
                            className="gantt-today-line"
                            style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                          />
                        )}
                        {/* タスクバー */}
                        <div
                          className={getBarClass(task)}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${task.planned_start?.slice(0, 10)} 〜 ${task.planned_end?.slice(0, 10)}`}
                        >
                          {widthPct > 12 ? `${task.progress}%` : ''}
                        </div>
                      </td>
                      <td className="gantt-progress-cell">
                        <ProgressInput task={task} onChange={handleProgressChange} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 24, height: 10, background: '#27ae60', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />完了</span>
        <span><span style={{ display: 'inline-block', width: 24, height: 10, background: '#2980b9', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />進行中</span>
        <span><span style={{ display: 'inline-block', width: 24, height: 10, background: '#c0392b', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />遅延中</span>
        <span><span style={{ display: 'inline-block', width: 24, height: 10, background: '#b0bec5', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />未着工</span>
        <span><span style={{ display: 'inline-block', width: 2,  height: 12, background: 'rgba(231,76,60,0.7)', marginRight: 4, verticalAlign: 'middle' }} />今日</span>
      </div>
    </Layout>
  );
}

// 進捗入力（blur で PATCH）
function ProgressInput({ task, onChange }) {
  const [value, setValue] = useState(task.progress);

  const handleBlur = () => {
    const n = Math.min(100, Math.max(0, Number(value)));
    setValue(n);
    if (n !== task.progress) onChange(task, n);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number" min="0" max="100"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        style={{ width: 52, padding: '4px 6px', border: '1px solid #ccd0d5', borderRadius: 4, fontSize: 13 }}
      />
      <span style={{ fontSize: 12, color: '#888' }}>%</span>
    </div>
  );
}

export default GanttChart;
