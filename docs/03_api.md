# API設計書 v1.0

| 項目 | 内容 |
| --- | --- |
| プロジェクト名 | 建築工事工程管理アプリ |
| ドキュメント種別 | API設計書 |
| バージョン | v1.0 |
| 作成日 | 2026年6月24日 |

## 1. 基本方針

- フロントエンド（React）とバックエンド（Node.js + Express）はREST APIで通信する。
- エンドポイントはすべて `/api/` から始まる。
- URL中の `:id` `:taskId` `:userId` はパス変数で、実際のID（UUID）に置き換える。

## 2. HTTPメソッド（CRUD）

| メソッド | 意味 | 使いどころ（例） |
| --- | --- | --- |
| GET | 取得する | 現場一覧を見る、工程を確認する |
| POST | 作成する | 新しい現場を登録する、ログインする |
| PATCH | 更新する | 工程の進捗率を変更する、情報を修正する |
| DELETE | 削除する | 現場を削除する、ユーザーを削除する |

**PUTとPATCHの違い**：本アプリは更新にPATCH（部分更新）を使う。変更したい項目だけ送ればよい（例：進捗率だけ変えたい場合は `{ "progress": 80 }` のみ送信）。

## 3. 認証の仕組み（JWT）

- ログイン（`POST /api/auth/login`）に成功するとJWTトークンが発行される。
- 以降のリクエストは必ずヘッダーにトークンを添付する：`Authorization: Bearer <token>`
- トークンが無い・期限切れの場合は **401エラー** を返し、フロントはログイン画面へリダイレクトする。
- トークン有効期限は24時間（アーキテクチャ設計書 6章）。

## 4. 権限（ロール）

各APIの「必要な権限」は `users.role`（admin / supervisor / viewer）で判定する。

- **admin**：管理者。全操作可能。
- **supervisor**：現場監督。工程の作成・更新が可能。
- **viewer**：閲覧のみ。

権限の無いロールが呼ぶと **403エラー** を返す。

## 5. API一覧

### 5-1. 認証 API（/api/auth）

#### POST /api/auth/login — ログインしてトークンを取得

- **概要**: メールアドレスとパスワードでログインする。成功するとJWTトークンが発行される。
- **送信データ**: `email`, `password`
- **返却データ**: `token`（JWT文字列）, `user`（id・name・email・role）
- **必要な権限**: 認証不要
- **注意**: パスワードは平文で送らない。必ずHTTPS通信を使う。

リクエスト例:
```json
{ "email": "tanaka@example.com", "password": "mypassword123" }
```
レスポンス例:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "a1b2c3d4-...", "name": "田中 太郎", "role": "admin" }
}
```

#### POST /api/auth/logout — ログアウト

- **概要**: ログアウトしてトークンを無効化する。
- **送信データ**: なし（ヘッダーのトークンで識別）
- **返却データ**: `{ "message": "ログアウトしました" }`
- **必要な権限**: 全ロール（ログイン済みであること）

#### GET /api/auth/me — ログイン中ユーザー情報の取得

- **概要**: 現在ログイン中のユーザー情報を返す。画面右上のユーザー名表示などに使う。
- **送信データ**: なし
- **返却データ**: `id`, `name`, `email`, `role`
- **必要な権限**: 全ロール

### 5-2. 現場管理 API（/api/projects）

機能要件 F-01・F-02・F-03 に対応。

#### GET /api/projects — 現場一覧を取得

- **概要**: 自分が参加している現場の一覧を取得する。ダッシュボード・現場一覧画面で使う。
- **送信データ**: なし（クエリで絞り込み可：`?status=in_progress` など。複数条件は `&` で連結）
- **返却データ**: `[{ id, name, status, progress（進捗率平均）, end_date, is_delayed }]`
- **必要な権限**: 全ロール

#### POST /api/projects — 現場を新規作成

- **概要**: 新しい現場を登録する。現場登録フォーム（S-08）の「登録する」で呼ばれる。
- **送信データ**: `name`, `address`（任意）, `start_date`, `end_date`, `status`
- **返却データ**: 作成した現場の全データ（idが採番されて返る）
- **必要な権限**: admin のみ（viewer・supervisorは403）

#### GET /api/projects/:id — 現場の詳細を取得

- **概要**: 指定IDの現場詳細を取得する。現場詳細画面（S-06）で使う。
- **送信データ**: なし
- **返却データ**: `{ id, name, address, start_date, end_date, status, members }`
- **必要な権限**: 全ロール（参加している現場のみ）

#### PATCH /api/projects/:id — 現場情報を更新

- **概要**: 現場情報を部分更新する。変更したい項目だけ送る。
- **送信データ**: 変更項目のみ（例：`name`, `address`, `end_date`, `status`）
- **返却データ**: 更新後の現場データ全体
- **必要な権限**: admin

リクエスト例（工期終了日だけ延長）:
```json
{ "end_date": "2026-10-31" }
```

#### DELETE /api/projects/:id — 現場を削除（論理削除）

- **概要**: 現場を削除する。関連する工程・通知も合わせて削除される。物理削除ではなく**論理削除**（`deleted_at`に日時を記録）で実装する。
- **送信データ**: なし
- **返却データ**: `{ "message": "削除しました" }`
- **必要な権限**: admin

### 5-3. 工程管理 API（/api/projects/:id/tasks, /api/tasks/:taskId）

ガントチャート画面（S-04）の中核。機能要件 F-04・F-05・F-06 に対応。

#### GET /api/projects/:id/tasks — 工程一覧を取得

- **概要**: 指定現場の工程一覧を取得する。`order_index` の昇順で返す。
- **送信データ**: なし
- **返却データ**: `[{ id, name, planned_start, planned_end, actual_start, actual_end, progress, is_delayed, order_index, assigned_to }]`
- **必要な権限**: 全ロール

#### POST /api/projects/:id/tasks — 工程を新規作成

- **概要**: 新しい工程を追加する。「工程追加」ボタンで呼ばれる。
- **送信データ**: `name`, `planned_start`, `planned_end`, `assigned_to`（任意）, `order_index`
- **返却データ**: 作成した工程の全データ
- **必要な権限**: admin・supervisor

#### PATCH /api/tasks/:taskId — 工程を更新（最重要API）

- **概要**: 工程の進捗率・実績日付などを更新する。現場監督がスマホで進捗を入力する最重要API。更新後に `is_delayed` を自動再計算する。
- **送信データ**: 変更項目のみ（`progress`, `actual_start`, `actual_end`, `name`, `planned_start`, `planned_end` など）
- **返却データ**: 更新後の工程データ全体（`is_delayed` が自動再計算されて返る）
- **必要な権限**: admin・supervisor

リクエスト例:
```json
{ "progress": 80, "actual_start": "2026-06-01" }
```
レスポンス例:
```json
{
  "id": "f9e8d7c6-...",
  "name": "鉄骨建方",
  "progress": 80,
  "is_delayed": false,
  "updated_at": "2026-06-24T10:30:00Z"
}
```

#### DELETE /api/tasks/:taskId — 工程を削除

- **概要**: 工程を削除する。関連する通知も合わせて削除される。
- **送信データ**: なし
- **返却データ**: `{ "message": "削除しました" }`
- **必要な権限**: admin

### 5-4. ユーザー管理 API（/api/users）

機能要件 F-12 に対応。すべて admin 専用。

#### GET /api/users — ユーザー一覧を取得

- **概要**: 全ユーザーの一覧を取得する。ユーザー管理画面（S-05）で使う。
- **返却データ**: `[{ id, name, email, role, created_at }]`
- **必要な権限**: admin のみ（viewer・supervisorは403）

#### POST /api/users/invite — ユーザーを招待

- **概要**: 新しいユーザーを招待する。指定メールアドレスに招待メールを送信（AWS SES使用）。メール内URLからパスワードを設定してアカウントが有効化される。
- **送信データ**: `email`, `role`
- **返却データ**: `{ "message": "招待メールを送信しました" }`
- **必要な権限**: admin のみ

#### PATCH /api/users/:userId/role — 役割を変更

- **概要**: 指定ユーザーのロールを変更する（例：supervisor→adminへ昇格）。
- **送信データ**: `role`（admin / supervisor / viewer）
- **返却データ**: 更新後のユーザーデータ
- **必要な権限**: admin のみ
- **注意**: 自分自身のロールは変更不可。最後の1人のadminをviewerに変更することも不可。

#### DELETE /api/users/:userId — ユーザーを削除（論理削除）

- **概要**: ユーザーを論理削除する。削除されたユーザーはログインできなくなる。
- **送信データ**: なし
- **返却データ**: `{ "message": "削除しました" }`
- **必要な権限**: admin のみ
- **注意**: 自分自身は削除不可。最後の1人のadminも削除不可。

### 5-5. 通知 API（/api/notifications）

機能要件 F-09・F-10 に対応。通知の**作成**はバックエンドの自動処理が行うため、フロントからの作成APIは無い。

#### GET /api/notifications — 通知一覧を取得

- **概要**: 自分宛ての通知一覧を取得する。通知一覧画面（S-07）とナビバーの通知ベルで使う。
- **送信データ**: なし（クエリで絞り込み可：`?type=delay`, `?unread=true`）
- **返却データ**: `[{ id, type, message, project_id, task_id, is_read, sent_at }]`
- **必要な権限**: 全ロール（自分宛ての通知のみ返る）

#### PATCH /api/notifications/:id/read — 通知を既読にする

- **概要**: 指定通知を既読にする。通知アイテムのクリックで自動的に呼ばれる。
- **返却データ**: 更新後の通知データ（`is_read: true`）
- **必要な権限**: 全ロール（自分の通知のみ操作可）

#### PATCH /api/notifications/read-all — 全通知を一括既読

- **概要**: 自分宛ての未読通知をすべて一括既読にする。「すべて既読にする」で呼ばれる。
- **返却データ**: `{ "message": "すべて既読にしました", "updated_count": 3 }`
- **必要な権限**: 全ロール

## 6. HTTPステータスコード

| コード | 意味 | 発生する場面 |
| --- | --- | --- |
| 200 | 成功 | GETやPATCHが正常完了したとき |
| 201 | 作成成功 | POSTで新しいデータを作成したとき |
| 400 | リクエスト不正 | 必須項目が空・日付形式が間違っているとき |
| 401 | 認証エラー | トークンなし・有効期限切れ |
| 403 | 権限エラー | viewerがadmin専用APIを呼んだとき |
| 404 | 見つからない | 存在しない現場ID・タスクIDを指定したとき |
| 500 | サーバーエラー | バックエンドで予期しないエラーが発生したとき |

## 7. エラーレスポンスの形式

エラー時は以下の形式で返す。

```json
{
  "error": "Unauthorized",
  "message": "トークンが無効または期限切れです。再度ログインしてください。",
  "statusCode": 401
}
```
```json
{
  "error": "Forbidden",
  "message": "この操作を行う権限がありません。",
  "statusCode": 403
}
```
```json
{
  "error": "Bad Request",
  "message": "現場名は必須です。",
  "statusCode": 400
}
```
