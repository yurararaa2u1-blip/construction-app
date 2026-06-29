const pool = require('../models/db');

const errRes = (res, status, error, message) =>
  res.status(status).json({ error, message, statusCode: status });

// GET /api/users — admin only
const getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');

    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('getUsers エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// PATCH /api/users/:userId/role — admin only
const updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');

    const { userId } = req.params;
    const { role } = req.body;

    if (userId === req.user.id)
      return errRes(res, 403, 'Forbidden', '自分自身のロールは変更できません');

    if (!['admin', 'supervisor', 'viewer'].includes(role))
      return errRes(res, 400, 'Bad Request', '無効なロールです（admin / supervisor / viewer）');

    const target = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]
    );
    if (target.rows.length === 0)
      return errRes(res, 404, 'Not Found', 'ユーザーが見つかりません');

    // 最後の admin の降格を防ぐ
    if (target.rows[0].role === 'admin' && role !== 'admin') {
      const { rows } = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND deleted_at IS NULL"
      );
      if (parseInt(rows[0].count) <= 1)
        return errRes(res, 403, 'Forbidden', '最後の管理者のロールは変更できません');
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id, name, email, role',
      [role, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateUserRole エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// DELETE /api/users/:userId — admin only（論理削除）
const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return errRes(res, 403, 'Forbidden', 'この操作を行う権限がありません');

    const { userId } = req.params;

    if (userId === req.user.id)
      return errRes(res, 403, 'Forbidden', '自分自身は削除できません');

    const target = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]
    );
    if (target.rows.length === 0)
      return errRes(res, 404, 'Not Found', 'ユーザーが見つかりません');

    // 最後の admin の削除を防ぐ
    if (target.rows[0].role === 'admin') {
      const { rows } = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND deleted_at IS NULL"
      );
      if (parseInt(rows[0].count) <= 1)
        return errRes(res, 403, 'Forbidden', '最後の管理者は削除できません');
    }

    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);
    res.json({ message: '削除しました' });
  } catch (err) {
    console.error('deleteUser エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = { getUsers, updateUserRole, deleteUser };
