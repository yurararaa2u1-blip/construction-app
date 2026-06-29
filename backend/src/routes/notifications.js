const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notifications');

router.use(authMiddleware);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);   // /:id より先に登録
router.patch('/:id/read', markAsRead);

module.exports = router;
