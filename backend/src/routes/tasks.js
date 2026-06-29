// ========================================
// 建築工事工程管理アプリ - タスクルーター
// ========================================
const express = require('express');

// ---- 現場別タスクルーター（GET/POST） ----
// /api/projects/:id/tasks に紐づく
// mergeParams: true で親ルーターの :id を引き継ぐ
const projectTasksRouter = express.Router({ mergeParams: true });

const { getTasksByProject, createTask, updateTask, deleteTask } = require('../controllers/tasks');
const authMiddleware = require('../middleware/auth');

// GET  /api/projects/:id/tasks → タスク一覧取得
projectTasksRouter.get('/', authMiddleware, getTasksByProject);

// POST /api/projects/:id/tasks → タスク作成
projectTasksRouter.post('/', authMiddleware, createTask);

// ---- 単体タスクルーター（PUT/DELETE） ----
// /api/tasks/:id に紐づく
const taskRouter = express.Router();

// PUT    /api/tasks/:id → タスク更新（title / status / due_date）
taskRouter.put('/:id', authMiddleware, updateTask);

// DELETE /api/tasks/:id → タスク削除
taskRouter.delete('/:id', authMiddleware, deleteTask);

module.exports = { projectTasksRouter, taskRouter };
