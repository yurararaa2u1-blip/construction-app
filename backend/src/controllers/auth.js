// ========================================
// 建築工事工程管理アプリ - 認証コントローラー
// ========================================
// コントローラー: ルートから呼ばれる「処理の本体」を担当するファイル
// ここでは「ユーザー登録」「ログイン」「ログイン中ユーザー情報取得」の3つを実装する

// bcrypt: パスワードを安全にハッシュ化（暗号化）するライブラリ
// パスワードをそのままDBに保存するのは危険なため、必ずハッシュ化する
const bcrypt = require('bcrypt');

// jsonwebtoken: JWTトークンを生成・検証するライブラリ
// JWTはログイン後にサーバーが発行する「認証済み証明書」のようなもの
const jwt = require('jsonwebtoken');

// DBとの接続プール（pool）を読み込む
// pool.query() でSQLを実行できるようになる
const pool = require('../models/db');

// ========================================
// JWTトークンを生成するヘルパー関数
// ========================================
// ユーザーIDを受け取り、署名済みJWTトークンを返す
// JWT_SECRET: トークンの改ざん防止に使う秘密鍵（.envから読み込む）
// expiresIn: トークンの有効期限（7日間）
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },             // トークンに埋め込む情報（ペイロード）
    process.env.JWT_SECRET,     // 署名に使う秘密鍵
    { expiresIn: '7d' }         // 有効期限: 7日間
  );
};

// ========================================
// ユーザー登録
// ========================================
// POST /api/auth/register から呼ばれる
// リクエストボディ: { name, email, password, role }
const register = async (req, res) => {
  try {
    // リクエストボディから必要な値を取り出す（分割代入）
    const { name, email, password, role } = req.body;

    // ---- バリデーション（入力チェック） ----
    // 必須項目が空の場合は 400 Bad Request を返す
    if (!name || !email || !password) {
      return res.status(400).json({ message: '名前・メール・パスワードは必須です' });
    }

    // ---- メールアドレスの重複チェック ----
    // 同じメールアドレスがDBにすでに存在するか確認する
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email] // $1 はプレースホルダー（SQLインジェクション対策）
    );

    // rows.length > 0 → 同じメールがすでに登録されている
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'このメールアドレスはすでに使用されています' });
    }

    // ---- パスワードのハッシュ化 ----
    // saltRounds: ハッシュ化の強度（数値が大きいほど安全だが処理が重くなる）
    // 10 が一般的な推奨値
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ---- DBにユーザーを保存 ----
    // RETURNING id, name, email, role → 保存したレコードの値を即座に返してもらう
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, role || 'worker'] // roleが未指定なら 'worker' をデフォルトに
    );

    // 保存されたユーザー情報を取り出す
    const newUser = result.rows[0];

    // ---- JWTトークンを生成 ----
    const token = generateToken(newUser.id);

    // 登録成功: 201 Created を返す
    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      token,
      user: newUser,
    });
  } catch (err) {
    // 予期しないエラーが発生した場合は 500 Internal Server Error を返す
    console.error('register エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ========================================
// ログイン
// ========================================
// POST /api/auth/login から呼ばれる
// リクエストボディ: { email, password }
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ---- バリデーション ----
    if (!email || !password) {
      return res.status(400).json({ message: 'メール・パスワードは必須です' });
    }

    // ---- DBからユーザーを検索 ----
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // ユーザーが見つからない場合 → 401 Unauthorized
    // セキュリティのため「メールが違う」「パスワードが違う」と分けずに同じメッセージを返す
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const user = result.rows[0];

    // ---- パスワードの検証 ----
    // bcrypt.compare: 入力パスワードとDBのハッシュを比較する
    // ハッシュは元に戻せないため、同じアルゴリズムで再ハッシュして比較する仕組み
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // ---- JWTトークンを生成 ----
    const token = generateToken(user.id);

    // レスポンスにパスワード（ハッシュ）を含めないよう除外する
    const { password_hash: _pw, ...userWithoutPassword } = user;

    // ログイン成功: 200 OK を返す
    res.status(200).json({
      message: 'ログインしました',
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('login エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ========================================
// ログイン中のユーザー情報取得
// ========================================
// GET /api/auth/me から呼ばれる（authミドルウェアを通過した後）
// authミドルウェアが req.user にユーザーIDをセットしているので、それを使ってDBを検索する
const getMe = async (req, res) => {
  try {
    // req.user.id は authミドルウェアがJWTを検証してセットした値
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    // ユーザーが見つからない場合（JWTは有効でもDBから削除された場合など）
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    // ユーザー情報を返す（パスワードは SELECT しないので安全）
    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('getMe エラー:', err.message);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 3つの関数を外部から使えるようにエクスポートする
module.exports = { register, login, getMe };
