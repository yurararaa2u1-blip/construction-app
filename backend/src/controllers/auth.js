// ========================================
// 建築工事工程管理アプリ - 認証コントローラー
// ========================================
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../models/db');

// JWTトークン生成（有効期限24時間 ← 設計書 docs/01_architecture.md 6章）
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

// エラーレスポンスのヘルパー（設計書 docs/03_api.md 7章の形式に統一）
const errRes = (res, status, error, message) =>
  res.status(status).json({ error, message, statusCode: status });

// ========================================
// ユーザー登録  POST /api/auth/register
// ========================================
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return errRes(res, 400, 'Bad Request', '名前・メール・パスワードは必須です');
    }

    // メール重複チェック（deleted_at に関わらず同一メールは登録不可）
    const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return errRes(res, 409, 'Conflict', 'このメールアドレスはすでに使用されています');
    }

    const password_hash = await bcrypt.hash(password, 10);

    // role が未指定なら 'viewer'（設計書の ENUM: admin / supervisor / viewer）
    const validRoles = ['admin', 'supervisor', 'viewer'];
    const userRole   = validRoles.includes(role) ? role : 'viewer';

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, password_hash, userRole]
    );

    const newUser = result.rows[0];
    const token   = generateToken(newUser.id);

    res.status(201).json({ message: 'ユーザー登録が完了しました', token, user: newUser });
  } catch (err) {
    console.error('register エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// ログイン  POST /api/auth/login
// ========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errRes(res, 400, 'Bad Request', 'メール・パスワードは必須です');
    }

    // 論理削除されていないユーザーのみ検索
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (result.rows.length === 0) {
      return errRes(res, 401, 'Unauthorized', 'メールアドレスまたはパスワードが正しくありません');
    }

    const user            = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errRes(res, 401, 'Unauthorized', 'メールアドレスまたはパスワードが正しくありません');
    }

    const token = generateToken(user.id);
    const { password_hash: _pw, ...userWithoutPassword } = user;

    res.status(200).json({ message: 'ログインしました', token, user: userWithoutPassword });
  } catch (err) {
    console.error('login エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

// ========================================
// ログイン中ユーザー取得  GET /api/auth/me
// ========================================
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return errRes(res, 404, 'Not Found', 'ユーザーが見つかりません');
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('getMe エラー:', err.message);
    errRes(res, 500, 'Internal Server Error', 'サーバーエラーが発生しました');
  }
};

module.exports = { register, login, getMe };
