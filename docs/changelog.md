# 変更履歴

本ファイルは、建築工事工程管理アプリの主要な変更を時系列で記録します。

形式は [Keep a Changelog](https://keepachangelog.com/) に準拠しています。

---

## 2026-07-10

### 検証

- **赤セクション（データ整合性・権限・遅延判定境界）を追加検証**
  - 3.4 現場情報の編集：住所とステータス変更→成功メッセージ→リロード後も保持
  - 3.5 現場の論理削除：一覧から消え、DBには残る（`deleted_at`にタイムスタンプがセット）
  - 5.2 遅延判定境界値（今日 & 未完了）：`newlyDelayedCount:0`、`is_delayed=false`のまま
  - 7.2 supervisor→adminロール変更：ユーザー管理画面・+新規作成ボタン・更新/削除ボタン等admin機能全て有効
    - JWT設計上、ロール変更後は再ログインが必要（動作確認済み）

### インフラ

- EC2再起動でパブリックIPが変わったため、CloudFront APIディストリビューションのオリジンを新DNS（`ec2-13-113-170-183.ap-northeast-1.compute.amazonaws.com`）に更新
- 長期対策としてはElastic IPで固定化するのが望ましい

### ドキュメント

- test-plan.html の未検証項目5件を「合格」に更新、7/10のテスト結果行を追加

---

## 2026-07-09

### 追加

- **Phase 5-B: AWS SES経由の遅延通知メール送信**
  - AWS SES セットアップ（東京リージョン、Sandboxモード）
    - Verified Identity: `yurarara.a2u1@gmail.com`
    - IAMユーザー `ses-sender-construction-app`（AmazonSESFullAccess）
  - バックエンド新規/更新
    - `backend/src/services/emailService.js` 新規（`SendEmailCommand` をラップ）
    - `backend/src/batch/delayedCheck.js` 更新（担当者 or admin にメール送信を追加、失敗時も次タスクへ継続）
    - `backend/src/batch/testSes.js` 新規（疎通テスト用スクリプト）
    - `@aws-sdk/client-ses` を dependency に追加
  - 環境変数（`.env`）に AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_EMAIL を追加

### インフラ

- EC2で `git pull` + `npm install` + `.env`更新 + PM2再起動を実施し、本番反映
- IAM アクセスキーのローテーション実施（漏洩対策のベストプラクティス）

### 検証

- ローカルで `testSes.js` と実バッチ（`delayedCheck.js`）→ Gmail受信を確認
- EC2上で `testSes.js` と実バッチ → Gmail受信を確認
- Sandboxモードのため、送信先は検証済みメール（ゆら）のみ

### 既知の制約

- Gmailアドレス（`@gmail.com`）を送信元にしているため、DKIM alignment 不整合で迷惑メール判定されがち
- 対処：Gmail側フィルタで「[遅延通知]」件名のメールを迷惑メールにしない設定を追加
- 根本解決には独自ドメインの取得＋SES検証が必要（今回は学習プロジェクトのため見送り）

---

## 2026-07-08

### 追加

- **project_members管理UI**（テスト計画書「発見した課題2」の対応）
  - バックエンドAPI（`backend/src/controllers/projects.js` / `backend/src/routes/projects.js`）
    - `GET /api/projects/:id/members` メンバー一覧取得（admin / created_by / メンバー本人）
    - `POST /api/projects/:id/members` メンバー追加（adminのみ）
    - `DELETE /api/projects/:id/members/:userId` メンバー削除（adminのみ）
    - ロールバリデーション（admin / supervisor / viewer のみ受付）、重複追加防止（409）
  - フロントエンドUI（`frontend/src/pages/ProjectDetail.jsx`）
    - 現場詳細画面に「メンバー」セクションを追加
    - 一覧は全ロール閲覧可、追加フォームと✕削除ボタンはadminのみに表示
    - 追加フォームのユーザードロップダウンは既存メンバーを除外

### 検証

- 全ロール（admin / supervisor / viewer）で本番環境の動作を確認
  - admin: メンバー追加・削除UI表示・実操作OK
  - supervisor / viewer: 一覧のみ表示、追加/削除UI非表示

### インフラ

- 本番デプロイ実施（S3アップロード → CloudFront `/*` キャッシュ削除 → EC2 git pull + PM2 restart）

---

## 2026-07-05

### 追加

- **401自動リダイレクト機能** (`frontend/src/api/client.js`)
  - APIレスポンスで401が返された場合、自動で`token`と`user`をLocalStorageから削除し、ログイン画面へ遷移する
  - JWT有効期限（24時間）切れによる混乱を防ぐUX改善

### 修正

- **フロント権限UIの改善**（テスト計画書「発見した課題1」の対応）
  - `frontend/src/pages/ProjectList.jsx`
    - 「＋ 新規作成」ボタンをadminのみに表示するよう修正
  - `frontend/src/pages/ProjectDetail.jsx`
    - 「更新する」「削除」ボタンをadminのみに表示
    - 「工程追加フォーム」をadmin/supervisorのみに表示
    - タスクの進捗率入力をviewerで`disabled`（グレーアウト）
    - タスクの「✕削除」ボタンをadminのみに表示

### インフラ

- **PM2の自動起動設定**（EC2）
  - `pm2 startup systemd`でsystemdに登録
  - `pm2 save`で現在のプロセス状態を保存
  - 再起動テストで自動復旧を確認（EC2再起動から約48秒でヘルスチェック応答）

### 検証

- 全ロール（admin / supervisor / viewer）で権限UIの動作をローカル環境で確認
- EC2再起動テストで自動起動を確認

---

## 2026-07-03

### 完了

- **動作テストの残項目を実施**
  - supervisor / viewer ロールの権限別動作確認
  - ユーザー削除機能の動作確認
  - 削除ユーザーがログインできないことを確認
  - 「最後のadmin」安全ガードをコードで確認

### データ

- テストユーザーを2名作成（テスト監督/supervisor、テスト一覧/viewer）
- `project_members`テーブルにテスト監督・テスト一覧を追加（SQL直接操作）

### 記録

- `docs/test-plan.html` に全テスト結果を記録

---

## 2026-07-02

### 追加

- **レスポンシブ対応**（ハンバーガーメニュー実装）
  - `frontend/src/components/Layout.jsx`
    - `useState`でサイドバー開閉状態を管理
    - ハンバーガーボタンを追加
    - サイドバーオーバーレイを追加
  - `frontend/src/styles.css`
    - `@media (max-width: 768px)`でスマホ・タブレット時のCSS追加
    - サイドバーをスライドイン・アウトするアニメーション

### 修正

- **CORS設定の改善**（`backend/src/app.js`）
  - `http://localhost:3000` / `http://localhost:3001` / `https://d1a8gn83rnvgqm.cloudfront.net` を明示的に許可
  - `allowedHeaders`、`methods`を明示的に指定

- **RDS SSL接続の設定**（`backend/src/models/db.js`）
  - `DB_HOST !== 'localhost'`の場合は`ssl: { rejectUnauthorized: false }`を有効化
  - ローカル開発時はSSL無効、本番RDS接続時はSSL有効

### インフラ

- **AWS本番デプロイ完了**
  - RDS PostgreSQL（construction-db, ap-northeast-1）
  - EC2 t3.micro（52.199.63.5）
  - S3（construction-frontend-2026）
  - CloudFrontフロント（d1a8gn83rnvgqm.cloudfront.net）
  - CloudFront API（d2sqygsot7k84c.cloudfront.net、CachingDisabled）
  - RDSセキュリティグループにEC2セキュリティグループからの接続を許可

### 追加ドキュメント

- `docs/test-plan.html`（動作テスト計画書）を作成

---

## 2026-07-01

### 追加

- Phase 5-A: 遅延判定バッチの実装
  - `backend/src/batch/delayedCheck.js`
  - 手動実行と定期実行（毎日0時）の両方に対応

---

## 解決済みの課題

- ~~課題1: フロント権限UIの不完全性~~ → 2026-07-07 本番反映
- ~~課題2: `project_members`管理UIがない~~ → 2026-07-08 本番反映
- ~~Phase 5-B: SESメール通知機能~~ → 2026-07-09 本番反映（Sandboxモード）

## 今後の予定

- 独自ドメイン取得＋SES本番アクセス申請（迷惑メール判定回避）
- 未検証のテスト項目（実機タッチ操作、バリデーション異常系など）
