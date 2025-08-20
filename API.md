## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Posts
- `GET /api/posts` - Get all posts (public feed)
- `POST /api/posts` - Create new post
- `GET /api/posts/:postId` - Get specific post
- `PUT /api/posts/:postId` - Update post
- `DELETE /api/posts/:postId` - Delete post
- `POST /api/posts/:postId/like` - Like/unlike post
- `GET /api/posts/search` - Search posts
- `GET /api/posts/user/:userId` - Get user's posts

### Comments
- `POST /api/comments/post/:postId` - Add comment to post
- `GET /api/comments/post/:postId` - Get post comments
- `PUT /api/comments/:commentId` - Update comment
- `DELETE /api/comments/:commentId` - Delete comment
- `POST /api/comments/:commentId/like` - Like/unlike comment

### Profile
- `GET /api/profile/me/current` - Get current user profile
- `GET /api/profile/:userId` - Get user profile
- `PUT /api/profile/me` - Edit current profile
- `POST /api/profile/:userId/follow` - Follow user
- `DELETE /api/profile/:userId/follow` - Unfollow user
- `GET /api/profile/:userId/followers` - Get user's followers
- `GET /api/profile/:userId/following` - Get user's following

### Chat
- `POST /api/chat/create` - Create or get chat
- `GET /api/chat` - Get user's chats
- `GET /api/chat/:chatId` - Get specific chat
- `POST /api/chat/:chatId/messages` - Send message
- `GET /api/chat/:chatId/messages` - Get chat messages
- `PUT /api/chat/:chatId/read` - Mark messages as read
- `DELETE /api/chat/messages/:messageId` - Delete message

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:notificationId/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification

### Search
- `GET /api/search/users` - Search users
- `GET /api/search/posts` - Search posts
- `GET /api/search/hashtags/trending` - Get trending hashtags
- `GET /api/search/users/suggested` - Get suggested users