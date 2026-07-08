const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAllProjects, createProject, getProjectById, updateProject, deleteProject,
  getProjectMembers, addProjectMember, removeProjectMember,
} = require('../controllers/projects');

// タスクルーターをネスト: GET/POST /api/projects/:id/tasks
// ここで先に登録することで /:id との競合を防ぐ
const { projectTasksRouter } = require('./tasks');

router.use(authMiddleware);

router.get('/', getAllProjects);
router.post('/', createProject);

// /:id/tasks を /:id より先に登録する（順序が重要）
router.use('/:id/tasks', projectTasksRouter);

// メンバー管理API
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', addProjectMember);
router.delete('/:id/members/:userId', removeProjectMember);

router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
