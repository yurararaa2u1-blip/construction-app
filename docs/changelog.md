# 変更履歴

本ファイルは、建築工事工程管理アプリの主要な変更を時系列で記録します。

形式は [Keep a Changelog](https://keepachangelog.com/) に準拠しています。

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

## 発見済みだが未解決の課題

- **課題2: `project_members`管理UIがない**
  - 現状：メンバー追加はSQL直接操作しかできない
  - 対応予定：現場詳細画面に「メンバー追加」機能を実装
  - 影響：中（運用上、admin以外のユーザーに現場を割り当てる手段がUIにない）

## 今後の予定

- 課題2の対応（project_members管理UI）
- Phase 5-B: SESメール通知機能
- 未検証のテスト項目（実機タッチ操作、バリデーション異常系など）
