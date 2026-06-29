# CLAUDE.md

このファイルはClaude Codeが各セッションの開始時に読み込むプロジェクトの指針です。
実装は必ず `docs/` 配下の設計書に従ってください。設計と異なる実装が必要になった場合は、勝手に進めず必ず確認を取ってください。

## プロジェクト概要

建築工事の工程を管理するWebアプリ。現場（プロジェクト）ごとにガントチャートで工程を管理し、
進捗入力・遅延の自動検出・メール通知を行う。利用者は管理者(admin)・現場監督(supervisor)・閲覧者(viewer)の3ロール。

- 主要ユースケース：現場監督がスマホで工程の進捗率を入力 → 遅延を自動判定 → 担当者へメール通知。
- 最重要API：`PATCH /api/tasks/:taskId`（進捗更新＋`is_delayed`自動再計算）。
- 最重要画面：S-04 工程管理（ガントチャート）。

## 設計書（必ず参照すること）

実装前に該当する設計書を読むこと。

- アーキテクチャ・技術スタック・データフロー → `docs/01_architecture.md`
- テーブル定義・リレーション・制約 → `docs/02_database.md`
- エンドポイント・リクエスト/レスポンス・権限・ステータスコード → `docs/03_api.md`
- 画面構成・UI要素・画面遷移 → `docs/04_screens.md`

## 技術スタック

| 区分 | 技術 |
| --- | --- |
| フロントエンド | React + Tailwind CSS |
| バックエンド | Node.js + Express |
| データベース | PostgreSQL |
| 認証 | JWT（有効期限24時間） |
| 通信 | REST API / HTTPS |
| 本番インフラ | AWS（EC2 / RDS / S3 / CloudFront / SES） |

### ローカル開発の方針
- まずローカルのPostgreSQLとローカルのNode.jsで、端から端まで動く状態を作る。
- AWSへのデプロイは全機能がローカルで完成した後の最終フェーズ。最初からAWSに依存する実装はしない。
- 環境依存の値（DB接続情報・JWTシークレット・SES設定など）は`.env`で管理し、リポジトリにコミットしない。

## ディレクトリ構成（想定）

```
project/
├── CLAUDE.md
├── docs/                # 設計書（このプロジェクトの正）
├── backend/             # Node.js + Express
│   ├── src/
│   │   ├── routes/      # APIルート（auth, projects, tasks, users, notifications）
│   │   ├── controllers/ # リクエスト処理
│   │   ├── services/    # ビジネスロジック（遅延判定・通知など）
│   │   ├── middlewares/ # 認証・権限チェック・エラーハンドラ
│   │   ├── models/      # DBアクセス
│   │   └── batch/       # 毎日のis_delayed更新バッチ
│   └── migrations/      # DBマイグレーション
└── frontend/            # React + Tailwind CSS
    └── src/
        ├── pages/       # 画面（S-01〜S-08）
        ├── components/  # 共通UI（NavBar, Sidebar, StatusBadge, ProgressBar, Modal）
        ├── api/         # APIクライアント
        └── hooks/       # 認証状態などのフック
```

## コーディング規約・実装ルール

### 全般
- 設計書に書かれた仕様を逸脱しない。仕様の曖昧さや矛盾に気づいたら、実装を止めて確認する。
- 1つのまとまった変更が終わるごとに動作確認できる粒度で進める（垂直スライス）。
- 命名は設計書のカラム名・フィールド名（snake_case）に合わせる。APIのJSONフィールドも設計書の表記に揃える。

### データベース
- 全テーブルの主キーは`UUID`。
- 全テーブルに`created_at` / `updated_at`を持たせる。
- パスワードは必ず`bcrypt`でハッシュ化して`password_hash`に保存する。**平文保存は禁止。**
- `progress`は0〜100の整数。`is_delayed`はバックエンドが管理し、フロントから直接更新させない。
- 論理削除：projects・usersの削除は物理削除せず`deleted_at`に日時を記録する。一覧取得は原則`WHERE deleted_at IS NULL`で絞る。
  （※下記「未解決の設計事項」も参照）

### 認証・権限
- 認証はJWT。`Authorization: Bearer <token>`ヘッダーで受け取り、ミドルウェアで検証する。
- 検証失敗（トークンなし/期限切れ）は`401`を返す。
- 権限判定は **`users.role`** を正とする（`project_members.role`は補助）。
- 権限不足は`403`を返す。各APIの「必要な権限」は`docs/03_api.md`に従う。
- 危険な操作のガード：自分自身のロール変更・自分自身の削除は不可。最後の1人のadminを降格・削除することも不可。

### API
- エンドポイント・メソッド・リクエスト/レスポンス形式は`docs/03_api.md`に厳密に従う。
- 更新はPATCH（部分更新）。送られてきた項目だけ更新する。
- エラーレスポンスは`{ error, message, statusCode }`の形式で統一する。
- ステータスコードは設計書の表（200/201/400/401/403/404/500）に従う。

### 遅延判定ロジック（重要）
- `PATCH /api/tasks/:taskId`の更新後、その工程の`is_delayed`を再計算する。
- 判定条件：`planned_end < 本日の日付` かつ `progress < 100` → `is_delayed = true`、それ以外は`false`。
- 別途、毎日深夜0時に全工程を再判定するバッチを用意する。`true`に変わった工程はnotificationsへレコード追加＋SES経由でメール通知。

### フロントエンド
- React + Tailwind CSS。スマホ・PC両対応のレスポンシブ（NF-02）。
- 共通UI（NavBar / Sidebar / StatusBadge / ProgressBar / Modal）はコンポーネント化して再利用する。
- 未認証で保護画面にアクセスした場合はログイン画面（S-01）へリダイレクトする。
- 画面遷移は`docs/04_screens.md`の遷移ルールに従う。

### セキュリティ
- 本番通信はHTTPS必須。シークレット類はコミットしない。
- SQLは必ずパラメータ化（SQLインジェクション対策）。
- パスワードは平文で保存・ログ出力しない。

## 推奨する実装フェーズ

1. **土台づくり**: プロジェクト雛形、ローカルPostgreSQL、env設定。
2. **DBと認証**: 5テーブルのマイグレーション → JWT認証（login/logout/me）、bcrypt、ロール基盤。
3. **API実装**: projects → tasks → users → notifications の順。`PATCH /api/tasks/:taskId`は特に丁寧に。
4. **フロント実装**: S-01 → S-02 から。APIと1画面ずつ接続。S-04ガントチャートは後半。
5. **バッチと通知**: 毎日の`is_delayed`更新バッチ＋SESメール通知。
6. **AWSデプロイ**: 全機能がローカルで完成してから。

## 未解決の設計事項（実装前に要確定）

以下は設計書間に不整合・未定義があり、実装で詰まる前にユーザーへ確認すること。

1. **論理削除カラムの欠落**: API設計書はprojects・usersを論理削除と定義しているが、DB設計書のテーブル定義に`deleted_at`が無い。本プロジェクトでは両テーブルに`deleted_at TIMESTAMP`（NULL許容）を追加する方針とする。確定するまでスキーマを勝手に変えない。
2. **権限の二重定義**: `users.role`と`project_members.role`が併存。システム全体の権限は`users.role`を使う方針。
3. **進捗率の平均算出**: `GET /api/projects`が返す`progress`は現場内タスクの進捗率平均と解釈する（算出方法の最終確認が必要）。
