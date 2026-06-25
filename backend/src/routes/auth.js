// ========================================
// 建築工事工程管理アプリ - 認証ルーター
// ========================================
// ルーター: URLパスと処理（コントローラー関数）を対応づけるファイル
// ここで定義したルートは app.js で /api/auth に紐付けて使う

// express.Router(): URLのパスとHTTPメソッドごとに処理を分けて登録できるオブジェクト
const express = require('express');
const router = express.Router();

// 認証コントローラー: 実際の処理（DB操作・JWT発行など）が書かれたファイル
const { register, login, getMe } = require('../controllers/auth');

// 認証ミドルウェア: JWTトークンの検証を行う
// このミドルウェアを挟んだルートは、有効なトークンがないとアクセスできない
const authMiddleware = require('../middleware/auth');

// ========================================
// ルートの登録
// ========================================

// POST /api/auth/register → ユーザー登録
// 認証不要（誰でもアクセスできる）
router.post('/register', register);

// POST /api/auth/login → ログイン
// 認証不要（誰でもアクセスできる）
router.post('/login', login);

// GET /api/auth/me → ログイン中のユーザー情報取得
// authMiddleware を先に通すことで、有効なJWTを持つユーザーだけがアクセスできる
// 処理の流れ: リクエスト → authMiddleware（トークン検証） → getMe（ユーザー情報返却）
router.get('/me', authMiddleware, getMe);

// 外部から使えるようにエクスポートする
// app.js で app.use('/api/auth', authRouter) のように登録して使う
module.exports = router;
