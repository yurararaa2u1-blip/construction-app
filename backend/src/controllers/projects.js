// ========================================
// 建築工事工程管理アプリ - 現場コントローラー
// 設計書 docs/03_api.md 5-2節に準拠
// ========================================
const pool = require('../models/db');

const errRes = (res, status, error, message) =>
  res.status(status).json({ error, message, statusCode: status });

// ========================================
// 現場一覧取得  GET /api/projects
// ========================================
// 自分が作成した、または project_members に参加している現場を返す
// 論理削除済み（deleted_at IS NOT NULL）は除外
const getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT p.*,
              COALESCE(ROUND(AVG(t.progress))::INTEGER, 0) AS progress,
              COALESCE(BOOL_OR(t.is_delayed), false)       AS is_delayed
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.deleted_at IS NULL
         AND (
           p.created_by = $1
           OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
         )
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.status(200).json({ projects: result.rows });
  } catch (err) {
    console.error('getAllProjects エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 現場新規作成  POST /api/projects
// ========================================
// 必要な権限: admin のみ（設計書 docs/03_api.md）
const createProject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { name, address, start_date, end_date, status } = req.body;

    if (!name || !start_date || !end_date) {
      return errRes(res, 400, 'Bad Request', '現場名・開始日・終了日は必須です');
    }

    const result = await pool.query(
      `INSERT INTO projects (name, address, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, address || null, start_date, end_date, status || 'planning', req.user.id]
    );

    res.status(201).json({ message: '現場を登録しました', project: result.rows[0] });
  } catch (err) {
    console.error('createProject エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 現場詳細取得  GET /api/projects/:id
// ========================================
const getProjectById = async (req, res) => {
  try {
    const { id }     = req.params;
    const userId     = req.user.id;

    const result = await pool.query(
      `SELECT p.*,
              u.name AS created_by_name,
              COALESCE(ROUND(AVG(t.progress))::INTEGER, 0) AS progress
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1
         AND p.deleted_at IS NULL
         AND (
           p.created_by = $2
           OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $2)
         )
       GROUP BY p.id, u.name`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '現場が見つかりません');
    }

    res.status(200).json({ project: result.rows[0] });
  } catch (err) {
    console.error('getProjectById エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 現場情報更新  PATCH /api/projects/:id
// ========================================
// PATCH = 部分更新。送られた項目だけ更新する
// 必要な権限: admin のみ
const updateProject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { id } = req.params;

    // 対象現場の存在確認
    const current = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (current.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '現場が見つかりません');
    }

    const proj = current.rows[0];
    const { name, address, start_date, end_date, status } = req.body;

    const result = await pool.query(
      `UPDATE projects
       SET name       = $1,
           address    = $2,
           start_date = $3,
           end_date   = $4,
           status     = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name       !== undefined ? name       : proj.name,
        address    !== undefined ? address    : proj.address,
        start_date !== undefined ? start_date : proj.start_date,
        end_date   !== undefined ? end_date   : proj.end_date,
        status     !== undefined ? status     : proj.status,
        id,
      ]
    );

    res.status(200).json({ message: '現場情報を更新しました', project: result.rows[0] });
  } catch (err) {
    console.error('updateProject エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// 現場削除（論理削除）  DELETE /api/projects/:id
// ========================================
// 物理削除せず deleted_at に日時を記録する
// 必要な権限: admin のみ
const deleteProject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { id } = req.params;

    const result = await pool.query(
      `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '現場が見つかりません');
    }

    res.status(200).json({ message: '削除しました' });
  } catch (err) {
    console.error('deleteProject エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = { getAllProjects, createProject, getProjectById, updateProject, deleteProject };
