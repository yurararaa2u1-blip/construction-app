const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getUsers, updateUserRole, deleteUser } = require('../controllers/users');

router.use(authMiddleware);

router.get('/', getUsers);
router.patch('/:userId/role', updateUserRole);
router.delete('/:userId', deleteUser);

module.exports = router;
