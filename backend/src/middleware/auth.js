// ========================================
// 建築工事工程管理アプリ - 認証ミドルウェア
// ========================================
const jwt  = require('jsonwebtoken');
const pool = require('../models/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized', message: '認証トークンがありません', statusCode: 401 });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized', message: 'トークンの形式が正しくありません', statusCode: 401 });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DBからロールを含む最新のユーザー情報を取得する
    // JWTペイロードにroleを入れると役割変更が即反映されないため、毎回DBを参照する
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'ユーザーが見つかりません', statusCode: 401 });
    }

    req.user = result.rows[0]; // { id, name, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'トークンの有効期限が切れています。再度ログインしてください', statusCode: 401 });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'トークンが無効です', statusCode: 401 });
  }
};

module.exports = authMiddleware;
