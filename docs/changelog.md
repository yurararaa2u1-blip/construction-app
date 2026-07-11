# 変更履歴

本ファイルは、建築工事工程管理アプリの主要な変更を時系列で記録します。

形式は [Keep a Changelog](https://keepachangelog.com/) に準拠しています。

---

## 2026-07-11（追加）

### 検証

- 緑セクション（認証UX）を検証
  - ログアウト後の保護URL直接アクセス → ログイン画面リダイレクトを確認
  - タブ閉じ再開でJWT（localStorage保存）のセッション保持を確認

---

## 2026-07-11

### 修正

- **工程の日付逆順バリデーションを実装**
  - バックエンド（`backend/src/controllers/tasks.js`）
    - createTask: `new Date(planned_end) < new Date(planned_start)` で400を返す
    - updateTask: 部分更新後の新旧混合パターンでも同じ検証を実施
  - フロントエンド（`frontend/src/pages/ProjectDetail.jsx`）
    - handleAddTask: 送信前にクライアント側でチェック、赤いエラーメッセージを表示
  - コミット: `c4d68f3 fix: 工程の予定完了日<予定開始日を拒否するバリデーションを追加`

### インフラ

- **Elastic IPを導入してEC2のパブリックIPを固定化**
  - 新IP: `54.238.180.233`
  - EC2再起動でIPが変わってCloudFrontオリジンを毎回更新する運用問題を解消
  - CloudFront APIディストリビューションのオリジンを新DNSに更新
  - 料金: EC2起動中は無料、停止中は約$0.005/時間（月$3.60程度）
  - 長期休止時はElastic IPをリリースする方針

### 検証

- ローカルで日付逆順バリデーション動作確認
- 本番反映（S3 → CloudFront `/*` → EC2 git pull + PM2 restart）
- 本番で日付逆順・正常系両方の動作確認済み

---

## 2026-07-10（午後）

### 修正

- **パスワード最小長バリデーション（8文字以上）を実装**
  - バックエンド（`backend/src/controllers/auth.js`）: `password.length < 8` で400 Bad Requestを返す
  - フロントエンド（`frontend/src/pages/Register.jsx`）: `<input>` に `minLength={8}` を追加、placeholderを「8文字以上」に変更
  - コミット: `f8a7219 fix: パスワード最小長バリデーション（8文字以上）を追加`

### 検証

- 未検証項目（黄セクション：バリデーション系）の検証
  - **パスワード短さ**：初回テストで未実装バグを発見→実装＆本番反映後、フロント側HTML5・バックエンド側400ともに動作確認
  - **必須項目未入力**：HTML5 required属性で送信ブロック、バックエンドも空チェック済み
  - **予定終了日<開始日**：未実装バグを発見（優先度低のため後日対応予定）

### インフラ

- 本番デプロイ実施（S3アップロード → CloudFront `/*` キャッシュ削除 → EC2 git pull + PM2 restart）
- 過去のテスト用ユーザーを本番DBから削除（短パス太郎、短パステスト2、任意）

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
- ~~パスワード最小長バリデーション未実装~~ → 2026-07-10 本番反映
- ~~工程作成時に予定終了日<予定開始日でも作成できてしまう~~ → 2026-07-11 本番反映
- ~~EC2 IPが再起動で変わりCloudFront更新が必要~~ → 2026-07-11 Elastic IP導入で解消

## 今後の予定

- 独自ドメイン取得＋SES本番アクセス申請（迷惑メール判定回避）
- 実機タッチ操作テスト（iPhone）
- ガントチャート横スクロールの実操作確認
- 認証UX項目（ログアウト後URL直接アクセス、タブ閉じ再開）
