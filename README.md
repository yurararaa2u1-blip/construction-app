# 建築工事工程管理システム

> 建築工事現場の「進捗管理」と「遅延通知」をブラウザとメールでできるWebアプリ

**本番URL**：https://d1a8gn83rnvgqm.cloudfront.net

---

## 📖 このプロジェクトについて

現場管理の課題（進捗の属人化・遅延発見の遅れ・情報共有の非効率）を解決するため、**役割ベース（admin / supervisor / viewer）** で機能が分かれる工程管理システムを構築しました。

- 🔒 JWT認証、bcryptでパスワードハッシュ化
- 📊 現場・工程のCRUD、進捗率のリアルタイム更新
- 📅 バッチで遅延自動判定、AWS SES経由でメール通知
- ☁️ AWS EC2/RDS/S3/CloudFront/SES で本番稼働中
- 📱 スマホ・PC対応（レスポンシブ）

---

## 🎯 詳細なポートフォリオ資料

このプロジェクトの**完全な振り返り資料**（技術スタック解説、学んだこと、苦労と解決策など）は下記からご覧いただけます。

- 📄 **[ポートフォリオ資料（Markdown版）](docs/portfolio/portfolio.md)** — GitHub上で読みやすい
- 🌐 **[ポートフォリオ資料（HTML版）](docs/portfolio/portfolio.html)** — 印刷やブラウザ表示向け

---

## 🛠 技術スタック（概要）

| 区分 | 技術 |
|---|---|
| フロント | React + Tailwind CSS |
| バックエンド | Node.js + Express |
| DB | PostgreSQL |
| 認証 | JWT + bcrypt |
| インフラ | AWS EC2 / RDS / S3 / CloudFront / SES / Elastic IP |
| 開発 | Git / GitHub / PM2 / VS Code |

---

## 📁 リポジトリ構成

```
construction-app/
├── README.md                 ← このファイル
├── CLAUDE.md                 ← プロジェクトのAI開発指針
├── backend/                  ← Node.js + Express API
│   ├── src/
│   │   ├── controllers/      ← リクエスト処理
│   │   ├── routes/           ← APIルート定義
│   │   ├── middleware/       ← 認証等の共通処理
│   │   ├── services/         ← ビジネスロジック（メール送信等）
│   │   ├── batch/            ← 遅延判定バッチ・スケジューラ
│   │   └── models/           ← DBアクセス
│   └── migrations/           ← DBマイグレーション
├── frontend/                 ← React + Tailwind CSS
│   └── src/
│       ├── pages/            ← 画面（S-01〜S-08）
│       ├── components/       ← 共通UI
│       ├── api/              ← APIクライアント
│       └── hooks/            ← カスタムフック
└── docs/                     ← 各種ドキュメント
    ├── portfolio/            ← ポートフォリオ資料
    ├── 01_architecture.md    ← アーキテクチャ設計書
    ├── 02_database.md        ← DB設計書
    ├── 03_api.md             ← API設計書
    ├── 04_screens.md         ← 画面設計書
    ├── changelog.md          ← 変更履歴
    └── test-plan.html        ← テスト計画書・結果
```

---

## 🚀 ローカル起動方法

### 前提

- Node.js v20 以上
- PostgreSQL 15 以上
- ローカルにPostgreSQLインスタンス（もしくは `.env` で外部DBを指定）

### バックエンド

```bash
cd backend
npm install
# .env ファイルを作成（DB接続情報、JWT_SECRET等を記述）
node src/app.js
# → http://localhost:3000 で起動
```

### フロントエンド

```bash
cd frontend
npm install
npm start
# → http://localhost:3001 で起動（ブラウザが自動オープン）
```

---

## 📚 主要ドキュメント

- [設計書：アーキテクチャ](docs/01_architecture.md)
- [設計書：データベース](docs/02_database.md)
- [設計書：API](docs/03_api.md)
- [設計書：画面設計](docs/04_screens.md)
- [変更履歴（changelog）](docs/changelog.md)
- [テスト計画書と結果](docs/test-plan.html)

---

## 👤 作者


- GitHub: [@yurararaa2u1-blip](https://github.com/yurararaa2u1-blip)

---

## 📝 ライセンス

このプロジェクトはポートフォリオ・学習目的で公開しています。
