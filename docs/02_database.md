# データベース設計書 v1.0

| 項目 | 内容 |
| --- | --- |
| プロジェクト名 | 建築工事工程管理アプリ |
| ドキュメント種別 | データベース設計書 |
| バージョン | v1.0 |
| 作成日 | 2026年6月24日 |
| データベース | PostgreSQL（AWS RDS） |

## 1. 概要・目的

本書は建築工事工程管理アプリのデータベース設計を定義する。PostgreSQL（AWS RDS）を使用し、全5テーブルでアプリのデータを管理する。

## 2. テーブル（エンティティ）一覧

| テーブル名 | 概要 | 詳細 |
| --- | --- | --- |
| users | ユーザー・権限情報 | ログインアカウント・役割（admin/supervisor/viewer）を管理 |
| projects | 現場・プロジェクト情報 | 現場名・住所・工期・ステータスを管理 |
| tasks | 工程・タスク情報 | ガントチャートの各工程・進捗率・遅延フラグを管理 |
| project_members | 現場メンバー管理（中間） | ユーザーと現場の多対多の関係を管理 |
| notifications | 通知履歴 | 遅延アラート・リマインダーの送信履歴を管理 |

## 3. テーブル定義（詳細）

凡例：PK＝主キー、FK＝外部キー、NOT NULL＝空欄禁止、DEFAULT＝省略時のデフォルト値

### 3-1. users（ユーザー・権限情報）

| Key | カラム名 | データ型 | 制約 | 説明 |
| --- | --- | --- | --- | --- |
| PK | id | UUID | NOT NULL | ユーザーID（一意な識別子） |
| | name | VARCHAR(100) | NOT NULL | 氏名 |
| | email | VARCHAR(255) | NOT NULL, UNIQUE | メールアドレス（ログインID） |
| | password_hash | VARCHAR(255) | NOT NULL | bcryptでハッシュ化したパスワード |
| | role | ENUM | NOT NULL | admin / supervisor / viewer |
| | created_at | TIMESTAMP | NOT NULL | 登録日時 |
| | updated_at | TIMESTAMP | NOT NULL | 更新日時 |

`role`の値：admin（管理者）、supervisor（現場監督）、viewer（閲覧のみ）

> ⚠️ **実装時の追加事項（要対応）**: usersは論理削除の対象だが、本テーブル定義に`deleted_at`カラムが無い。`deleted_at TIMESTAMP`（NULL許容）を追加すること。詳細は本書末尾の「実装前の注意事項」を参照。

### 3-2. projects（現場・プロジェクト情報）

| Key | カラム名 | データ型 | 制約 | 説明 |
| --- | --- | --- | --- | --- |
| PK | id | UUID | NOT NULL | プロジェクトID（一意な識別子） |
| | name | VARCHAR(200) | NOT NULL | 現場名 |
| | address | TEXT | | 現場住所 |
| | start_date | DATE | NOT NULL | 工期開始日 |
| | end_date | DATE | NOT NULL | 工期終了日 |
| | status | ENUM | NOT NULL | planning / in_progress / completed / on_hold |
| FK | created_by | UUID | NOT NULL | 作成者（users.idを参照） |
| | created_at | TIMESTAMP | NOT NULL | 登録日時 |
| | updated_at | TIMESTAMP | NOT NULL | 更新日時 |

`status`の値：planning（計画中）、in_progress（進行中）、completed（完了）、on_hold（保留）

> ⚠️ **実装時の追加事項（要対応）**: projectsは論理削除の対象だが、本テーブル定義に`deleted_at`カラムが無い。`deleted_at TIMESTAMP`（NULL許容）を追加すること。

### 3-3. tasks（工程・タスク情報）

| Key | カラム名 | データ型 | 制約 | 説明 |
| --- | --- | --- | --- | --- |
| PK | id | UUID | NOT NULL | タスクID（一意な識別子） |
| FK | project_id | UUID | NOT NULL | 所属プロジェクト（projects.idを参照） |
| | name | VARCHAR(200) | NOT NULL | 工程名（例：基礎工事・鉄骨建方） |
| | planned_start | DATE | NOT NULL | 予定開始日 |
| | planned_end | DATE | NOT NULL | 予定完了日 |
| | actual_start | DATE | | 実際の開始日（着工後に入力） |
| | actual_end | DATE | | 実際の完了日（完了後に入力） |
| | progress | INTEGER | DEFAULT 0 | 進捗率（0〜100） |
| | is_delayed | BOOLEAN | DEFAULT false | 遅延フラグ（バックエンドが自動更新） |
| | order_index | INTEGER | NOT NULL | ガントチャートの表示順 |
| FK | assigned_to | UUID | | 担当者（users.idを参照） |
| | created_at | TIMESTAMP | NOT NULL | 登録日時 |
| | updated_at | TIMESTAMP | NOT NULL | 更新日時 |

**`is_delayed`の自動更新ロジック**：`planned_end < 本日の日付` かつ `progress < 100` の場合に `true` へ更新（バックエンドが毎日チェック）。

### 3-4. project_members（現場メンバー管理・中間テーブル）

| Key | カラム名 | データ型 | 制約 | 説明 |
| --- | --- | --- | --- | --- |
| PK | id | UUID | NOT NULL | レコードID（一意な識別子） |
| FK | project_id | UUID | NOT NULL | プロジェクト（projects.idを参照） |
| FK | user_id | UUID | NOT NULL | ユーザー（users.idを参照） |
| | role | ENUM | NOT NULL | そのプロジェクト内での役割 |
| | joined_at | TIMESTAMP | NOT NULL | 参加日時 |

中間テーブル：usersとprojectsの多対多（N:M）の関係を管理する。1人のユーザーが複数の現場に参加でき、1つの現場に複数のユーザーが参加できる。

> ℹ️ **権限の扱いに関する決定事項**: 本テーブルにも`role`があるが、**システム全体の権限判定は`users.role`を使う**こと（API設計書の「必要な権限」はすべて`users.role`基準）。`project_members.role`は現場単位の表示・補助用途に留める。

### 3-5. notifications（通知履歴）

| Key | カラム名 | データ型 | 制約 | 説明 |
| --- | --- | --- | --- | --- |
| PK | id | UUID | NOT NULL | 通知ID（一意な識別子） |
| FK | project_id | UUID | NOT NULL | 対象プロジェクト（projects.idを参照） |
| FK | task_id | UUID | | 対象タスク（tasks.idを参照） |
| FK | user_id | UUID | NOT NULL | 通知先ユーザー（users.idを参照） |
| | type | ENUM | NOT NULL | delay / reminder / info |
| | message | TEXT | NOT NULL | 通知メッセージ本文 |
| | is_read | BOOLEAN | DEFAULT false | 既読フラグ |
| | sent_at | TIMESTAMP | NOT NULL | 送信日時 |

`type`の値：delay（遅延通知）、reminder（リマインダー）、info（お知らせ）

## 4. テーブル間のリレーション（関係）

| テーブル間の関係 | 種類 | 説明 |
| --- | --- | --- |
| users → projects | 1:N | 1人のユーザーが複数の現場を作成できる |
| projects → tasks | 1:N | 1つの現場に複数の工程がある |
| users ↔ projects | N:M | 複数のユーザーが複数の現場に参加（project_membersで管理） |
| projects → notifications | 1:N | 1つの現場で複数の通知が発生する |
| tasks → notifications | 1:N | 1つの工程で複数の通知が発生する |

## 5. 主要な設計ポイント

### 5-1. 主キーにUUIDを採用する理由

全テーブルの主キー（id）にUUIDを採用する。連番ID（1,2,3...）と比較して以下のメリットがある。

- URLからIDが推測できないため、セキュリティリスクを低減できる
- 世界中で同じ値が生成される確率がほぼゼロで、将来的なデータ統合にも対応しやすい
- 全ユーザー数・全現場数などの内部情報が外部から推測されない

### 5-2. is_delayedの自動更新ロジック

工程の遅延検出（機能要件F-06）は以下のロジックで自動化する。

- 毎日深夜0時にバックエンドのバッチ処理が実行される
- 条件：`planned_end < 本日の日付` かつ `progress < 100`
  - 条件を満たす場合：`is_delayed = true` に更新
  - 条件を満たさない場合：`is_delayed = false` に更新
  - `is_delayed`が`true`になった場合：notificationsテーブルにレコードを追加し、SES（メール送信サービス）経由で担当者にメール通知を送信する

### 5-3. パスワードのセキュリティ

usersテーブルの`password_hash`には生のパスワード文字列を保存しない。bcryptでハッシュ化（不可逆変換）した値を保存する。

- 【禁止】`password: 'mypassword123'`（生のパスワードをDBに保存してはいけない）
- 【正解】`password_hash: '$2b$10$X9...'`（bcryptでハッシュ化した値。元のパスワードは復元できない）

### 5-4. created_at / updated_atを全テーブルに設ける理由

すべてのテーブルに登録日時（created_at）と更新日時（updated_at）を設ける。障害発生時の原因調査や変更履歴の確認に必須の情報である。

## 実装前の注意事項（設計書間の不整合・要解決）

実装着手前に以下を確定させること。

1. **論理削除カラムの欠落**: API設計書では`DELETE /api/projects/:id`・`DELETE /api/users/:userId`を論理削除（`deleted_at`に日時を記録、復元可能）と定義しているが、本DB設計書のprojects・usersテーブルに`deleted_at`カラムが存在しない。両テーブルに `deleted_at TIMESTAMP`（NULL許容、デフォルトNULL）を追加する。一覧取得系のクエリは原則 `WHERE deleted_at IS NULL` で絞り込む。
2. **権限判定の基準**: 権限チェックは`users.role`を正とする（上記3-4参照）。
