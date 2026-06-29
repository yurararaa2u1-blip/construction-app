// ========================================
// 建築工事工程管理アプリ - 工程ルーター
// ========================================
const express = require('express');
const { getTasksByProject, createTask, updateTask, deleteTask } = require('../controllers/tasks');
const authMiddleware = require('../middleware/auth');

// ---- 現場別工程ルーター（GET / POST） ----
// projects.js の router.use('/:id/tasks', ...) でネスト登録される
// mergeParams: true で親ルーターの :id（project_id）を引き継ぐ
const projectTasksRouter = express.Router({ mergeParams: true });
projectTasksRouter.get('/',  authMiddleware, getTasksByProject);
projectTasksRouter.post('/', authMiddleware, createTask);

// ---- 単体工程ルーター（PATCH / DELETE） ----
// app.js で /api/tasks にマウントされる
// 設計書: PATCH /api/tasks/:taskId
const taskRouter = express.Router();
taskRouter.patch('/:taskId',  authMiddleware, updateTask);
taskRouter.delete('/:taskId', authMiddleware, deleteTask);

module.exports = { projectTasksRouter, taskRouter };
