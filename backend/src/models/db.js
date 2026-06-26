// ========================================
// 建築工事工程管理アプリ - データベース接続設定
// ========================================

// pg: Node.jsからPostgreSQLに接続するためのライブラリ（パッケージ名は "pg"）
// Pool: 複数のデータベース接続をまとめて管理する「接続プール」クラス
// 接続プールを使うと、リクエストのたびに接続を開閉する手間が省け、パフォーマンスが上がる
const { Pool } = require('pg');

// ========================================
// 接続プールの作成
// ========================================
// .envファイルに書かれた環境変数を使って接続情報を設定する
// process.env.XXX で .env の値を読み取れる（app.jsで dotenv.config() を呼んでいるため使える）
const pool = new Pool({
  host:     process.env.DB_HOST,     // データベースサーバーのホスト名（例: localhost）
  port:     process.env.DB_PORT,     // PostgreSQLのポート番号（デフォルトは 5432）
  database: process.env.DB_NAME,     // 接続するデータベース名
  user:     process.env.DB_USER,     // データベースのユーザー名
  password: process.env.DB_PASSWORD, // データベースのパスワード
  ssl: false,
});

// ========================================
// 接続確認
// ========================================
// pool.connect() で実際に接続を試みる
// 接続に成功・失敗したときにログを出力して、問題をすぐ気づけるようにする
pool.connect((err, client, release) => {
  if (err) {
    // 接続に失敗した場合: エラーの内容をコンソールに表示する
    console.error('データベースへの接続に失敗しました:', err.message);
    return;
  }

  // 接続に成功した場合: 成功メッセージを表示する
  console.log('データベースに接続しました');

  // release(): 確認のために借りた接続をプールに返す
  // これを忘れると接続が占有されたままになるため必ず呼ぶ
  release();
});

// ========================================
// エクスポート
// ========================================
// 他のファイルから require('./models/db') で pool を使えるようにする
// 例）const pool = require('./models/db');
//     const result = await pool.query('SELECT * FROM projects');
module.exports = pool;
