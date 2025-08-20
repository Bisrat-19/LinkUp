const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create or get existing chat between two users
const createOrGetChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create chat with yourself'
      });
    }

    // Check if user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] },
      isGroupChat: false
    });

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [currentUserId, userId],
        isGroupChat: false
      });
      await chat.save();
    }

    // Populate participants
    await chat.populate('participants', 'username profilePic');
    await chat.populate('lastMessage');

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Create/get chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/get chat'
    });
  }
};

// Get all chats for current user
const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chats = await Chat.find({
      participants: currentUserId
    })
      .populate('participants', 'username profilePic')
      .populate('lastMessage')
      .populate('lastMessage.sender', 'username profilePic')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({
      participants: currentUserId
    });

    res.json({
      success: true,
      data: chats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalChats: total,
        hasNext: skip + chats.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chats'
    });
  }
};

// Get single chat by ID
const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'username profilePic')
      .populate('lastMessage')
      .populate('lastMessage.sender', 'username profilePic');

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === currentUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat'
    });
  }
};

// Send message in chat
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text', replyTo } = req.body;
    const currentUserId = req.user.id;

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check reply message if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reply message'
        });
      }
    }

    const message = new Message({
      chat: chatId,
      sender: currentUserId,
      content,
      messageType,
      replyTo: replyTo || null
    });

    await message.save();

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    
    // Update unread count for other participants
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== currentUserId) {
        const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await chat.save();

    // Populate message details
    await message.populate('sender', 'username profilePic');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Create notification for other participants
    chat.participants.forEach(async (participantId) => {
      if (participantId.toString() !== currentUserId) {
        await Notification.create({
          recipient: participantId,
          sender: currentUserId,
          type: 'message',
          chat: chatId,
          message: message._id
        });
      }
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
};

// Get messages for a chat
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username profilePic')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chat: chatId });

    // Mark messages as read
    await Message.updateMany(
      { 
        chat: chatId, 
        sender: { $ne: currentUserId },
        'readBy.user': { $ne: currentUserId }
      },
      { 
        $push: { 
          readBy: { 
            user: currentUserId, 
            readAt: new Date() 
          } 
        } 
      }
    );

    // Reset unread count for this user
    chat.unreadCount.set(currentUserId.toString(), 0);
    await chat.save();

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: skip + messages.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      { 
        chat: chatId, 
        sender: { $ne: currentUserId },
        'readBy.user': { $ne: currentUserId }
      },
      { 
        $push: { 
          readBy: { 
            user: currentUserId, 
            readAt: new Date() 
          } 
        } 
      }
    );

    // Reset unread count for this user
    chat.unreadCount.set(currentUserId.toString(), 0);
    await chat.save();

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages'
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
};

module.exports = {
  createOrGetChat,
  getUserChats,
  getChat,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  deleteMessage
};
