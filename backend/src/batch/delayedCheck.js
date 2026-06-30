// ========================================
// 遅延判定バッチ
//
// 【なぜこのファイルが必要か】
// PATCH /api/tasks/:taskId は「誰かが進捗を入力したとき」だけ is_delayed を更新する。
// しかし誰も入力しない日があると、期限を過ぎても is_delayed=false のまま放置される。
// このバッチは「毎日深夜0時に全工程を強制チェック」することでその穴を埋める。
// ========================================
// このファイルを直接実行するとき用（app.js 経由でない場合）の .env 読み込み
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const pool = require('../models/db');

const runDelayedCheck = async () => {
  // 今日の日付（時刻は切り捨てて 00:00:00 にする）
  // なぜ切り捨てるか: planned_end は DATE 型（日付のみ）なので、
  // 時刻込みで比較すると「今日の 15:00 時点ではまだ期限内」のような誤判定を防ぐため
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]; // 例: '2026-06-30'

  console.log(`\n[遅延判定バッチ] 開始: ${new Date().toLocaleString('ja-JP')}`);
  console.log(`[遅延判定バッチ] 判定基準日: ${todayStr}`);

  try {
    // -------------------------------------------------------
    // Step 1: 「本来は遅延のはずなのに is_delayed=false のまま」のタスクを探す
    //
    // 条件:
    //   planned_end < 今日（期限切れ）
    //   progress < 100（未完了）
    //   is_delayed = false（まだ遅延とマークされていない）
    //
    // この3つを満たすタスクが「今日新たに遅延になったタスク」
    // -------------------------------------------------------
    const newlyDelayed = await pool.query(
      `SELECT t.id, t.name, t.planned_end, t.progress, t.assigned_to,
              t.project_id, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE p.deleted_at IS NULL
         AND t.progress < 100
         AND t.planned_end < $1
         AND t.is_delayed = false`,
      [todayStr]
    );

    console.log(`[遅延判定バッチ] 新たに遅延となったタスク数: ${newlyDelayed.rows.length}`);

    // -------------------------------------------------------
    // Step 2: 新規遅延タスクを is_delayed=true に更新し、通知を記録する
    // -------------------------------------------------------
    for (const task of newlyDelayed.rows) {
      // is_delayed を true に更新
      await pool.query(
        'UPDATE tasks SET is_delayed = true, updated_at = NOW() WHERE id = $1',
        [task.id]
      );

      // 通知メッセージを作成
      const plannedEndStr = task.planned_end
        ? new Date(task.planned_end).toLocaleDateString('ja-JP')
        : '不明';
      const message = `「${task.name}」（${task.project_name}）が予定完了日（${plannedEndStr}）を過ぎています。現在の進捗: ${task.progress}%`;

      // 通知先ユーザーを決定する
      // - assigned_to（担当者）が設定されていればその人に通知
      // - 設定されていなければ admin 全員に通知
      let userIds = [];
      if (task.assigned_to) {
        userIds = [task.assigned_to];
      } else {
        const admins = await pool.query(
          "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL"
        );
        userIds = admins.rows.map(u => u.id);
      }

      // notifications テーブルに記録する
      // なぜ記録するか: フロントの通知一覧画面（S-07）に表示するため
      for (const userId of userIds) {
        await pool.query(
          `INSERT INTO notifications (project_id, task_id, user_id, type, message)
           VALUES ($1, $2, $3, 'delay', $4)`,
          [task.project_id, task.id, userId, message]
        );
      }

      // ローカル開発ではコンソールに出力してメール送信をシミュレートする
      // 本番（AWS SES）では、ここをメール送信処理に置き換える
      console.log(`  [メール通知シミュレート]`);
      console.log(`    宛先ユーザー数: ${userIds.length}`);
      console.log(`    内容: ${message}`);
    }

    // -------------------------------------------------------
    // Step 3: 「すでに is_delayed=true だが今日も未完了」のタスクの updated_at を更新
    //
    // なぜ必要か: 昨日のバッチで遅延になったタスクが今日も遅延中の場合、
    // is_delayed=true はすでに正しいので更新は不要。
    // ただし件数だけカウントしてログに残す（運用監視のため）
    // -------------------------------------------------------
    const stillDelayed = await pool.query(
      `SELECT COUNT(*) AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE p.deleted_at IS NULL
         AND t.progress < 100
         AND t.planned_end < $1
         AND t.is_delayed = true`,
      [todayStr]
    );

    console.log(`[遅延判定バッチ] 継続中の遅延タスク数: ${stillDelayed.rows[0].count}`);
    console.log(`[遅延判定バッチ] 完了: ${new Date().toLocaleString('ja-JP')}\n`);

    return {
      newlyDelayedCount: newlyDelayed.rows.length,
      stillDelayedCount: parseInt(stillDelayed.rows[0].count),
    };
  } catch (err) {
    console.error('[遅延判定バッチ] エラー:', err.message);
    throw err;
  }
};

// このファイルを直接 `node src/batch/delayedCheck.js` で実行したとき用のエントリーポイント
// なぜ必要か: 動作確認やデバッグのとき、スケジューラーを経由せず手動でバッチを走らせるため
if (require.main === module) {
  runDelayedCheck()
    .then(result => {
      console.log('バッチ実行結果:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('バッチ実行エラー:', err);
      process.exit(1);
    });
}

module.exports = { runDelayedCheck };
