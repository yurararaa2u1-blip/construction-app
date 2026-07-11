// ========================================
// 建築工事工程管理アプリ - 工程コントローラー
// 設計書 docs/03_api.md 5-3節に準拠
// 最重要API: PATCH /api/tasks/:taskId（進捗更新 + is_delayed 自動再計算）
// ========================================
const pool = require('../models/db');

const errRes = (res, status, error, message) =>
  res.status(status).json({ error, message, statusCode: status });

// ========================================
// is_delayed 再計算ロジック
// ========================================
// 設計書 docs/02_database.md 5-2節
// 判定条件: planned_end < 本日の日付 AND progress < 100 → true, それ以外 → false
const calcIsDelayed = (planned_end, progress) => {
  if (progress >= 100) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(planned_end);
  end.setHours(0, 0, 0, 0);
  return end < today;
};

// ========================================
// 工程一覧取得  GET /api/projects/:id/tasks
// ========================================
// order_index 昇順で返す（ガントチャートの表示順）
const getTasksByProject = async (req, res) => {
  try {
    const { id } = req.params; // project_id

    const result = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1
       ORDER BY t.order_index ASC, t.created_at ASC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getTasksByProject エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 工程新規作成  POST /api/projects/:id/tasks
// ========================================
// 必要な権限: admin・supervisor
const createTask = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'supervisor') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { id } = req.params; // project_id
    const { name, planned_start, planned_end, assigned_to, order_index } = req.body;

    if (!name || !planned_start || !planned_end) {
      return errRes(res, 400, 'Bad Request', '工程名・予定開始日・予定完了日は必須です');
    }

    if (new Date(planned_end) < new Date(planned_start)) {
      return errRes(res, 400, 'Bad Request', '予定完了日は予定開始日以降の日付にしてください');
    }

    // 作成時点で is_delayed を計算する
    const is_delayed = calcIsDelayed(planned_end, 0);

    // order_index が未指定の場合は現在の最大値 + 1 にする
    let idx = order_index;
    if (idx === undefined || idx === null) {
      const maxIdx = await pool.query(
        'SELECT COALESCE(MAX(order_index), -1) AS max FROM tasks WHERE project_id = $1',
        [id]
      );
      idx = maxIdx.rows[0].max + 1;
    }

    const result = await pool.query(
      `INSERT INTO tasks
         (project_id, name, planned_start, planned_end, assigned_to, order_index, is_delayed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, planned_start, planned_end, assigned_to || null, idx, is_delayed]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createTask エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 工程更新（最重要API）  PATCH /api/tasks/:taskId
// ========================================
// 部分更新: 送られた項目だけ更新する
// 更新後に is_delayed を自動再計算する
// 必要な権限: admin・supervisor
const updateTask = async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'supervisor') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { taskId } = req.params;

    // 現在のタスクを取得
    const current = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (current.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '工程が見つかりません');
    }

    const task = current.rows[0];
    const {
      name, planned_start, planned_end,
      actual_start, actual_end, progress,
      assigned_to, order_index,
    } = req.body;

    // 送られた値を使い、未送信は現在値を維持（部分更新）
    const newPlannedStart = planned_start !== undefined ? planned_start : task.planned_start;
    const newPlannedEnd   = planned_end   !== undefined ? planned_end   : task.planned_end;
    const newProgress     = progress      !== undefined ? Number(progress) : task.progress;

    // 更新後の開始日・完了日が逆順にならないかチェック
    if (new Date(newPlannedEnd) < new Date(newPlannedStart)) {
      return errRes(res, 400, 'Bad Request', '予定完了日は予定開始日以降の日付にしてください');
    }

    // is_delayed の自動再計算
    const new_is_delayed = calcIsDelayed(newPlannedEnd, newProgress);

    const result = await pool.query(
      `UPDATE tasks
       SET name          = $1,
           planned_start = $2,
           planned_end   = $3,
           actual_start  = $4,
           actual_end    = $5,
           progress      = $6,
           is_delayed    = $7,
           assigned_to   = $8,
           order_index   = $9,
           updated_at    = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        name          !== undefined ? name          : task.name,
        planned_start !== undefined ? planned_start : task.planned_start,
        newPlannedEnd,
        actual_start  !== undefined ? actual_start  : task.actual_start,
        actual_end    !== undefined ? actual_end    : task.actual_end,
        newProgress,
        new_is_delayed,
        assigned_to   !== undefined ? assigned_to   : task.assigned_to,
        order_index   !== undefined ? order_index   : task.order_index,
        taskId,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('updateTask エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 工程削除  DELETE /api/tasks/:taskId
// ========================================
// 必要な権限: admin のみ
const deleteTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { taskId } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [taskId]
    );

    if (result.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '工程が見つかりません');
    }

    res.status(200).json({ message: '削除しました' });
  } catch (err) {
    console.error('deleteTask エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = { getTasksByProject, createTask, updateTask, deleteTask };
