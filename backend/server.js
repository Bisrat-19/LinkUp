require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./app');
const { createServer } = require('http');
const { Server } = require('socket.io');
const SocketService = require('./src/services/socketService');

const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  const server = createServer(app);

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Initialize Socket.IO service
  new SocketService(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server initialized`);
  });
};

startServer();