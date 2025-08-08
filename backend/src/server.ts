import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth';
import noteRoutes from './routes/notes';
import fileRoutes from './routes/files';
import whiteboardRoutes from './routes/whiteboard';
import pdfRoutes from './routes/pdf';
import teacherRoutes from './routes/teacher';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
if (process.env.NODE_ENV === 'development') {
  // For development, try to connect to local MongoDB first
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nannotes-dev')
    .then(() => {
      console.log('Connected to local MongoDB');
    })
    .catch(async (error) => {
      console.log('Local MongoDB not available, using in-memory database');
      // If local MongoDB fails, use in-memory database
      const { setupMemoryDatabase } = await import('./database/memory-db');
      await setupMemoryDatabase();
    });
} else {
  // For production, use the provided MongoDB URI
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nannotes')
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/files', pdfRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/teachers', teacherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NANNOTES API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
