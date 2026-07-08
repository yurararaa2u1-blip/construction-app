// ========================================
// SES送信の疎通テスト（動作確認用スクリプト）
//
// 使い方: node src/batch/testSes.js
// このスクリプトは1通のテストメールを yurarara.a2u1@gmail.com に送信する。
// SES認証情報と検証済みIDの設定が正しく動くかを最小構成で確認するためのもの。
// ========================================
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const { sendDelayEmail } = require('../services/emailService');

(async () => {
  console.log('SES 疎通テスト開始');
  console.log(`  AWS_REGION      = ${process.env.AWS_REGION}`);
  console.log(`  SES_FROM_EMAIL  = ${process.env.SES_FROM_EMAIL}`);
  console.log(`  ACCESS_KEY_ID   = ${process.env.AWS_ACCESS_KEY_ID ? '(設定済み)' : '(未設定)'}`);
  console.log(`  SECRET_KEY      = ${process.env.AWS_SECRET_ACCESS_KEY ? '(設定済み)' : '(未設定)'}`);
  console.log('');

  const result = await sendDelayEmail({
    to: 'yurarara.a2u1@gmail.com',
    taskName: 'テスト工程',
    projectName: 'テスト現場',
    plannedEndStr: '2026/6/30',
    progress: 30,
  });

  if (result.ok) {
    console.log(`✓ 送信成功 MessageId: ${result.messageId}`);
    console.log('  Gmailの受信ボックスを確認してください（迷惑メールフォルダも念のため）');
  } else {
    console.error(`✗ 送信失敗: ${result.error}`);
  }
  process.exit(result.ok ? 0 : 1);
})();
