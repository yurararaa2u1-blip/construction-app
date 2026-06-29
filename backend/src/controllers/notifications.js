const pool = require('../models/db');

const errRes = (res, status, error, message) =>
  res.status(status).json({ error, message, statusCode: status });

// GET /api/notifications — 自分宛ての通知一覧
const getNotifications = async (req, res) => {
  try {
    const { type, unread } = req.query;
    const conditions = ['user_id = $1'];
    const params = [req.user.id];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    if (unread === 'true') {
      conditions.push('is_read = false');
    }

    const result = await pool.query(
      `SELECT n.*, p.name AS project_name
       FROM notifications n
       LEFT JOIN projects p ON p.id = n.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.sent_at DESC`,
      params
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('getNotifications エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// PATCH /api/notifications/:id/read — 個別既読
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return errRes(res, 404, 'Not Found', '通知が見つかりません');
    res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error('markAsRead エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// PATCH /api/notifications/read-all — 一括既読
const markAllAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ message: 'すべて既読にしました', updated_count: result.rowCount });
  } catch (err) {
    console.error('markAllAsRead エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
