const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Ensure .env is loaded from the correct path
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Fallback: manually set JWT_SECRET if .env loading failed
if (!process.env.JWT_SECRET) {
  console.log('🔧 JWT_SECRET not loaded from .env, setting manually');
  process.env.JWT_SECRET =
    'stackit-super-secret-jwt-key-2024-change-in-production';
  process.env.PORT = process.env.PORT || '5000';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/stackit';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
}

console.log('✅ JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log(
  '✅ JWT_SECRET length:',
  process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
);

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const answersRoutes = require('./routes/answers');
const userRoutes = require('./routes/users');
const tagRoutes = require('./routes/tags');
const adminRoutes = require('./routes/admin');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Rate limiting - Development-friendly configuration
const shouldEnableRateLimit = () => {
  // Environment variable override takes precedence
  if (process.env.RATE_LIMIT_ENABLED !== undefined) {
    return process.env.RATE_LIMIT_ENABLED === 'true';
  }

  // Production: always enabled
  // Development: disabled by default
  return process.env.NODE_ENV === 'production';
};

const getRateLimitMax = () => {
  // Environment variable override takes precedence
  if (process.env.RATE_LIMIT_MAX) {
    return parseInt(process.env.RATE_LIMIT_MAX);
  }

  // Production: 100 requests per 15 minutes
  // Development: 1,000,000 requests (effectively unlimited)
  return process.env.NODE_ENV === 'production' ? 100 : 1000000;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: getRateLimitMax(),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Log rate limiting configuration
if (shouldEnableRateLimit()) {
  console.log(`🔒 Rate limiting: ${getRateLimitMax()} requests per 15 minutes`);
} else {
  console.log('🔓 Rate limiting: DISABLED');
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(morgan('combined'));

// Apply rate limiting conditionally
if (shouldEnableRateLimit()) {
  app.use(limiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(
    `🔍 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`,
  );
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  // Join user to their personal room
  socket.join(`user:${socket.userId}`);

  // Handle notifications
  socket.on('send-notification', async (data) => {
    try {
      // Save notification to database
      const notification = await require('./models/Notification').create({
        recipient: data.recipientId,
        type: data.type,
        content: data.content,
        questionId: data.questionId,
        answerId: data.answerId,
        sender: socket.userId,
      });

      // Send to recipient
      io.to(`user:${data.recipientId}`).emit('notification', notification);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });

  // Handle real-time updates
  socket.on('join-question', (questionId) => {
    socket.join(`question:${questionId}`);
  });

  socket.on('leave-question', (questionId) => {
    socket.leave(`question:${questionId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:', err);
  console.error('❌ Error stack:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Debug environment variables
    console.log(
      '🔍 Server Debug - JWT_SECRET exists:',
      !!process.env.JWT_SECRET,
    );
    console.log(
      '🔍 Server Debug - JWT_SECRET length:',
      process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    );
    console.log('🔍 Server Debug - NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 Server Debug - PORT:', process.env.PORT || 5000);

    server.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(
        '✅ Ensure Vite proxy forwards /api calls correctly to the server.',
      );
      console.log('✅ Available routes:');
      console.log('   - POST /api/answers/:questionId (create answer)');
      console.log('   - GET /api/answers/question/:questionId (get answers)');
      console.log('   - PUT /api/answers/:answerId (update answer)');
      console.log('   - DELETE /api/answers/:answerId (delete answer)');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
