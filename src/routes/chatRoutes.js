const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/fileUpload');
const {
  createOrGetChat,
  getUserChats,
  getChat,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  deleteMessage
} = require('../controllers/chatController');

// All chat routes require authentication
router.use(auth);

router.post('/create', createOrGetChat); // Create or get existing chat
router.get('/', getUserChats); // Get all chats for current user
router.get('/:chatId', getChat); // Get single chat
router.post('/:chatId/messages', uploadSingle('media'), sendMessage); // Send message
router.get('/:chatId/messages', getChatMessages); // Get messages for a chat
router.put('/:chatId/read', markMessagesAsRead); // Mark messages as read
router.delete('/messages/:messageId', deleteMessage); // Delete message

module.exports = router;