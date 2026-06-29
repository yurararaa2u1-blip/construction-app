-- ========================================
-- 建築工事工程管理アプリ - 初期スキーマ
-- 設計書 docs/02_database.md に準拠
-- ========================================

-- 既存テーブルをすべて削除（依存順に DROP）
DROP TABLE IF EXISTS notifications   CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS tasks           CASCADE;
DROP TABLE IF EXISTS projects        CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- UUID生成関数を有効化（PostgreSQL標準搭載）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- users（ユーザー・権限情報）
-- ========================================
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('admin', 'supervisor', 'viewer')),
  deleted_at    TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ========================================
-- projects（現場・プロジェクト情報）
-- ========================================
CREATE TABLE projects (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  address     TEXT,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'planning'
              CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  created_by  UUID         NOT NULL REFERENCES users(id),
  deleted_at  TIMESTAMP,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ========================================
-- tasks（工程・タスク情報）
-- ========================================
CREATE TABLE tasks (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  planned_start DATE         NOT NULL,
  planned_end   DATE         NOT NULL,
  actual_start  DATE,
  actual_end    DATE,
  progress      INTEGER      NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_delayed    BOOLEAN      NOT NULL DEFAULT false,
  order_index   INTEGER      NOT NULL DEFAULT 0,
  assigned_to   UUID         REFERENCES users(id),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ========================================
-- project_members（現場メンバー中間テーブル）
-- ========================================
CREATE TABLE project_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'viewer')),
  joined_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- ========================================
-- notifications（通知履歴）
-- ========================================
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id     UUID        REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('delay', 'reminder', 'info')),
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  sent_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);
