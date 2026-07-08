// ========================================
// メール送信サービス（AWS SES）
//
// 【なぜこのファイルが必要か】
// 遅延判定バッチが「新たに遅延したタスク」を検出したとき、
// 担当者や管理者にメール通知する必要がある。
// AWS SES SDK の呼び出しをここに集約することで、
// バッチ本体は「誰に何を送るか」だけを気にすれば良くなる。
// ========================================
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const region = process.env.AWS_REGION || 'ap-northeast-1';
const fromEmail = process.env.SES_FROM_EMAIL;

// SES クライアントは1度だけ作成して使い回す
// なぜ: リクエストごとに作ると、内部の認証・接続の初期化が毎回走ってしまう
const sesClient = new SESClient({ region });

// ========================================
// 遅延通知メールを送信する
//
// 引数:
//   to             宛先メールアドレス（文字列）
//   taskName       工程名（例：屋根工事）
//   projectName    現場名（例：大阪駅ビル新築工事）
//   plannedEndStr  予定完了日の文字列（例：2026/6/30）
//   progress       進捗率（0〜100の整数）
//
// 返り値:
//   { ok: true,  messageId } 送信成功
//   { ok: false, error }     送信失敗（例外は投げず、エラー内容を返す）
// ========================================
const sendDelayEmail = async ({ to, taskName, projectName, plannedEndStr, progress }) => {
  if (!fromEmail) {
    return { ok: false, error: 'SES_FROM_EMAIL が .env に設定されていません' };
  }

  const subject = `[遅延通知] ${projectName} - ${taskName}`;
  const bodyText =
    `以下の工程が予定完了日を過ぎており、遅延しています。\n\n` +
    `現場名: ${projectName}\n` +
    `工程名: ${taskName}\n` +
    `予定完了日: ${plannedEndStr}\n` +
    `現在の進捗: ${progress}%\n\n` +
    `建築工事工程管理システムより自動送信\n` +
    `https://d1a8gn83rnvgqm.cloudfront.net`;

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Text: { Data: bodyText, Charset: 'UTF-8' } },
    },
  });

  try {
    const result = await sesClient.send(command);
    return { ok: true, messageId: result.MessageId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

module.exports = { sendDelayEmail };
