const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getAllProjects, createProject, getProjectById, updateProject, deleteProject } = require('../controllers/projects');

router.use(authMiddleware);

router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
