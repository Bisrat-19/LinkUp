# LinkUp Backend API

A comprehensive social media backend built with Node.js, Express, MongoDB, and Socket.IO.

## Features

### 🔐 Authentication & User Management
- User registration and login with JWT
- Profile management (edit bio, username, profile picture)
- Follow/unfollow users
- View user profiles and statistics

### 📝 Posts & Content
- Create, read, update, delete posts
- Support for text, images, and videos
- Hashtag support and extraction
- Like/unlike posts
- Public/private post visibility

### 💬 Comments & Interactions
- Add, edit, delete comments
- Nested comment replies
- Like/unlike comments
- Comment threading

### 💬 Real-Time Chat
- One-to-one messaging
- Real-time message delivery
- Typing indicators
- Message read receipts
- File sharing support

### 🔔 Notifications
- Post-related notifications (likes, comments)
- Follow notifications
- Chat message notifications
- Mark as read/unread
- Real-time delivery

### 🔍 Search & Discovery
- Search users by username/bio
- Search posts by keywords/hashtags
- Trending hashtags
- Suggested users to follow

### 🛡️ Security Features
- JWT authentication
- Rate limiting
- Input validation
- XSS protection
- Secure file uploads

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **File Upload**: Multer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Containerization**: Docker

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd LinkUp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/linkup

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Security
BCRYPT_SALT_ROUNDS=12
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or run MongoDB directly
mongod
```

### 5. Run the application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Docker Setup

### Using Docker Compose (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build the image
docker build -t linkup

# Run the container
docker run -p 5000:5000 -v $(pwd)/uploads:/app/uploads linkup-backend
```

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Custom middlewares
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   └── utils/           # Utility functions
├── uploads/             # File uploads
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker services
└── package.json         # Dependencies
```
