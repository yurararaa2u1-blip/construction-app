// ========================================
// 建築工事工程管理アプリ - バックエンドサーバー
// ========================================

// dotenv: .envファイルに書いた設定（ポート番号など）をNode.jsで読み込めるようにするライブラリ
// require()より前に呼ぶことで、以降のコードで process.env.XXX が使えるようになる
require('dotenv').config();

// express: WebサーバーをNode.jsで簡単に作るためのフレームワーク
const express = require('express');

// cors: フロントエンド（別のオリジン）からのHTTPリクエストを許可するミドルウェア
// 例）フロントが http://localhost:5173 、バックエンドが http://localhost:3000 の場合に必要
const cors = require('cors');

// ========================================
// データベース接続の初期化
// ========================================
// このファイルを読み込んだ時点で PostgreSQL への接続プールが作られ、接続確認が実行される
require('./models/db');

// Expressアプリケーションのインスタンスを作成する
// 以降、app.get() や app.use() でルートやミドルウェアを登録していく
const app = express();

// ========================================
// ポート番号の設定
// ========================================
// .envファイルに PORT=3000 と書いてあればその値を使う
// .envに書いていない場合は 3000 をデフォルト値として使う
const PORT = process.env.PORT || 3000;

// ========================================
// ミドルウェアの設定
// ========================================

// CORSを有効にする
// これにより、フロントエンドのJavaScript（React など）から
// このサーバーへのAPIリクエストが許可される
app.use(cors());

// リクエストボディをJSON形式で受け取れるようにする
// フロントエンドから送られてくるJSONデータを req.body で読み取るために必要
app.use(express.json());

// ========================================
// ルーティングの設定
// ========================================

// 認証API: /api/auth/register, /api/auth/login, /api/auth/me
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const projectsRouter = require('./routes/projects');
app.use('/api/projects', projectsRouter);

// タスクAPI（PATCH/DELETE /api/tasks/:taskId）
// GET/POST /api/projects/:id/tasks は routes/projects.js 内でネスト登録済み
const { taskRouter } = require('./routes/tasks');
app.use('/api/tasks', taskRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);

// ========================================
// バッチスケジューラーの起動
// ========================================
// なぜここで起動するか: サーバーが立ち上がると同時にスケジューラーも動き始めるようにするため
const { startScheduler } = require('./batch/scheduler');
startScheduler();

// ヘルスチェック用エンドポイント
// GET /health にアクセスするとサーバーが正常に動いているか確認できる
// 例）curl http://localhost:3000/health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'サーバーは正常に動いています',
    timestamp: new Date().toISOString(), // 現在日時（ISO 8601形式）
  });
});

// ========================================
// サーバーの起動
// ========================================
// 指定したポートでリクエストの受付を開始する
app.listen(PORT, () => {
  console.log(`サーバーが起動しました → http://localhost:${PORT}`);
  console.log(`ヘルスチェック → http://localhost:${PORT}/health`);
});

module.exports = app;
