const pool = require('../models/db');

// 現場一覧取得
const getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT p.*,
              u.name as created_by_name,
              COUNT(DISTINCT pm.user_id) as member_count,
              COUNT(DISTINCT t.id) as task_count
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.created_by = $1
          OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      projects: result.rows
    });
  } catch (error) {
    console.error('現場一覧取得エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};

// 現場新規作成
const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, location, start_date, end_date, status } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '現場名は必須です' });
    }

    const result = await pool.query(
      `INSERT INTO projects (name, description, location, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, location, start_date, end_date, status || 'planning', userId]
    );

    res.status(201).json({
      success: true,
      message: '現場を登録しました',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('現場作成エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};

// 現場詳細取得
const getProjectById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1
         AND (p.created_by = $2 OR p.id IN (
           SELECT project_id FROM project_members WHERE user_id = $2
         ))`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '現場が見つかりません' });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('現場詳細取得エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};

// 現場更新
const updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, location, start_date, end_date, status } = req.body;

    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, message: '更新権限がありません' });
    }

    const result = await pool.query(
      `UPDATE projects
       SET name=$1, description=$2, location=$3, start_date=$4, end_date=$5, status=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [name, description, location, start_date, end_date, status, id]
    );

    res.json({ success: true, message: '現場情報を更新しました', project: result.rows[0] });
  } catch (error) {
    console.error('現場更新エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};

// 現場削除
const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, message: '削除権限がありません' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({ success: true, message: '現場を削除しました' });
  } catch (error) {
    console.error('現場削除エラー:', error);
    res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
  }
};

module.exports = { getAllProjects, createProject, getProjectById, updateProject, deleteProject };
