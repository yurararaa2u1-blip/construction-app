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

// ========================================
// メンバー一覧取得  GET /api/projects/:id/members
// ========================================
// 対象現場に紐づくメンバー一覧を返す
// 現場作成者本人 or admin or 対象現場に参加しているユーザーのみアクセス可
const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // アクセス権限チェック（admin または created_by または メンバー）
    const access = await pool.query(
      `SELECT p.id FROM projects p
       WHERE p.id = $1 AND p.deleted_at IS NULL
         AND (
           $2 = 'admin'
           OR p.created_by = $3
           OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $3)
         )`,
      [id, req.user.role, userId]
    );
    if (access.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '現場が見つかりません');
    }

    const result = await pool.query(
      `SELECT pm.id, pm.user_id, pm.role AS member_role, pm.joined_at,
              u.name, u.email
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND u.deleted_at IS NULL
       ORDER BY pm.joined_at ASC`,
      [id]
    );

    res.status(200).json({ members: result.rows });
  } catch (err) {
    console.error('getProjectMembers エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// メンバー追加  POST /api/projects/:id/members
// ========================================
// 必要な権限: admin のみ
const addProjectMember = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { id } = req.params;
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return errRes(res, 400, 'Bad Request', 'user_id と role は必須です');
    }
    if (!['admin', 'supervisor', 'viewer'].includes(role)) {
      return errRes(res, 400, 'Bad Request', '無効なロールです（admin / supervisor / viewer）');
    }

    // 現場の存在確認
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (projectCheck.rows.length === 0) {
      return errRes(res, 404, 'Not Found', '現場が見つかりません');
    }

    // ユーザーの存在確認
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [user_id]
    );
    if (userCheck.rows.length === 0) {
      return errRes(res, 404, 'Not Found', 'ユーザーが見つかりません');
    }

    // すでにメンバー登録済みか確認
    const existing = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, user_id]
    );
    if (existing.rows.length > 0) {
      return errRes(res, 409, 'Conflict', 'このユーザーは既にメンバーです');
    }

    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3) RETURNING id, user_id, role, joined_at`,
      [id, user_id, role]
    );

    res.status(201).json({ message: 'メンバーを追加しました', member: result.rows[0] });
  } catch (err) {
    console.error('addProjectMember エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// メンバー削除  DELETE /api/projects/:id/members/:userId
// ========================================
// 必要な権限: admin のみ
const removeProjectMember = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');
    }

    const { id, userId } = req.params;

    const result = await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return errRes(res, 404, 'Not Found', 'メンバーが見つかりません');
    }

    res.status(200).json({ message: 'メンバーを削除しました' });
  } catch (err) {
    console.error('removeProjectMember エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = {
  getAllProjects, createProject, getProjectById, updateProject, deleteProject,
  getProjectMembers, addProjectMember, removeProjectMember,
};
