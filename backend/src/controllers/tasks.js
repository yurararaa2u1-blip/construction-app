// ========================================
// 建築工事工程管理アプリ - タスクコントローラー
// ========================================
// 各現場（project）に紐づくタスクの CRUD 処理を担当する

const pool = require('../models/db');

// ========================================
// タスク一覧取得
// ========================================
// GET /api/projects/:id/tasks
// 指定した現場に紐づくタスクを due_date 昇順で返す
const getTasksByProject = async (req, res) => {
  try {
    const { id } = req.params; // URL の :id = project_id

    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE project_id = $1
       ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getTasksByProject エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ========================================
// タスク作成
// ========================================
// POST /api/projects/:id/tasks
// リクエストボディ: { title, due_date（任意） }
const createTask = async (req, res) => {
  try {
    const { id } = req.params;        // project_id
    const { title, due_date } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'タスク名は必須です' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, status, due_date)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [id, title.trim(), due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createTask エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ========================================
// タスク更新
// ========================================
// PUT /api/tasks/:id
// リクエストボディ: { title, status, due_date } のうち変更したいものだけ送る
const updateTask = async (req, res) => {
  try {
    const { id } = req.params; // task_id
    const { title, status, due_date } = req.body;

    // 現在のタスクを取得して、未指定の項目は既存値をそのまま使う
    const current = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'タスクが見つかりません' });
    }

    const task = current.rows[0];

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, status = $2, due_date = $3
       WHERE id = $4
       RETURNING *`,
      [
        title    !== undefined ? title.trim() : task.title,
        status   !== undefined ? status       : task.status,
        due_date !== undefined ? due_date      : task.due_date,
        id,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('updateTask エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ========================================
// タスク削除
// ========================================
// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'タスクが見つかりません' });
    }

    res.status(200).json({ message: 'タスクを削除しました' });
  } catch (err) {
    console.error('deleteTask エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

module.exports = { getTasksByProject, createTask, updateTask, deleteTask };
