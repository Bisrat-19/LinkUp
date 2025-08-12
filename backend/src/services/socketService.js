const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // Map to store user ID -> socket ID
    this.typingUsers = new Map(); // Map to store chat ID -> typing users

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('username profilePic');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = decoded.id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.username} (${socket.userId})`);
      
      // Store user socket mapping
      this.userSockets.set(socket.userId, socket.id);

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Handle joining chat rooms
      socket.on('join-chat', (chatId) => {
        socket.join(`chat:${chatId}`);
        console.log(`User ${socket.user.username} joined chat ${chatId}`);
      });

      // Handle leaving chat rooms
      socket.on('leave-chat', (chatId) => {
        socket.leave(`chat:${chatId}`);
        console.log(`User ${socket.user.username} left chat ${chatId}`);
      });

      // Handle typing indicators
      socket.on('typing-start', (chatId) => {
        this.handleTypingStart(socket, chatId);
      });

      socket.on('typing-stop', (chatId) => {
        this.handleTypingStop(socket, chatId);
      });

      // Handle new message
      socket.on('new-message', async (data) => {
        await this.handleNewMessage(socket, data);
      });

      // Handle message read
      socket.on('mark-read', async (data) => {
        await this.handleMarkRead(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleTypingStart(socket, chatId) {
    if (!this.typingUsers.has(chatId)) {
      this.typingUsers.set(chatId, new Set());
    }
    
    this.typingUsers.get(chatId).add(socket.userId);
    
    // Emit typing indicator to other users in the chat
    socket.to(`chat:${chatId}`).emit('user-typing', {
      chatId,
      userId: socket.userId,
      username: socket.user.username
    });
  }

  handleTypingStop(socket, chatId) {
    if (this.typingUsers.has(chatId)) {
      this.typingUsers.get(chatId).delete(socket.userId);
      
      if (this.typingUsers.get(chatId).size === 0) {
        this.typingUsers.delete(chatId);
      }
    }
    
    // Emit typing stop indicator
    socket.to(`chat:${chatId}`).emit('user-typing-stop', {
      chatId,
      userId: socket.userId
    });
  }

  async handleNewMessage(socket, data) {
    try {
      const { chatId, content, messageType = 'text', replyTo } = data;
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(socket.userId)) {
        return;
      }

      // Create message
      const message = new Message({
        chat: chatId,
        sender: socket.userId,
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
        if (participantId.toString() !== socket.userId) {
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

      // Emit message to all users in the chat
      this.io.to(`chat:${chatId}`).emit('new-message', {
        message,
        chatId
      });

      // Send notification to other participants
      chat.participants.forEach(async (participantId) => {
        if (participantId.toString() !== socket.userId) {
          // Create notification
          await Notification.create({
            recipient: participantId,
            sender: socket.userId,
            type: 'message',
            chat: chatId,
            message: message._id
          });

          // Emit notification to user if online
          const participantSocketId = this.userSockets.get(participantId.toString());
          if (participantSocketId) {
            this.io.to(participantSocketId).emit('new-notification', {
              type: 'message',
              chatId,
              sender: {
                id: socket.userId,
                username: socket.user.username,
                profilePic: socket.user.profilePic
              }
            });
          }
        }
      });

    } catch (error) {
      console.error('Error handling new message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleMarkRead(socket, data) {
    try {
      const { chatId } = data;
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(socket.userId)) {
        return;
      }

      // Mark messages as read
      await Message.updateMany(
        { 
          chat: chatId, 
          sender: { $ne: socket.userId },
          'readBy.user': { $ne: socket.userId }
        },
        { 
          $push: { 
            readBy: { 
              user: socket.userId, 
              readAt: new Date() 
            } 
          } 
        }
      );

      // Reset unread count for this user
      chat.unreadCount.set(socket.userId.toString(), 0);
      await chat.save();

      // Emit read receipt to other users in the chat
      socket.to(`chat:${chatId}`).emit('messages-read', {
        chatId,
        userId: socket.userId
      });

    } catch (error) {
      console.error('Error handling mark read:', error);
    }
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.user.username} (${socket.userId})`);
    
    // Remove user socket mapping
    this.userSockets.delete(socket.userId);
    
    // Remove user from typing indicators
    this.typingUsers.forEach((users, chatId) => {
      users.delete(socket.userId);
      if (users.size === 0) {
        this.typingUsers.delete(chatId);
      }
    });
  }

  // Method to emit notification to specific user
  emitNotification(userId, notification) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new-notification', notification);
    }
  }

  // Method to emit to all users in a chat
  emitToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  // Method to emit to specific user
  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

module.exports = SocketService;
