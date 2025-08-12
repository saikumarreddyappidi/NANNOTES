import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Database connection state
let isMongoConnected = false;
let connectionAttempted = false;

// In-memory storage as fallback
let inMemoryUsers: any[] = [];
let inMemoryNotes: any[] = [];
let userIdCounter = 1;
let noteIdCounter = 1;

// MongoDB connection attempt
async function connectToMongoDB() {
  if (connectionAttempted) return;
  connectionAttempted = true;

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nannotes';
    console.log('🔄 Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.log('❌ MongoDB connection failed, using in-memory storage as fallback');
    console.log('Error:', error);
    isMongoConnected = false;
  }
}

// Enhanced User Schema for in-memory storage
interface InMemoryUser {
  _id: string;
  registrationNumber: string;
  password: string;
  role: 'student' | 'staff';
  year?: number;
  semester?: number;
  course?: string;
  subject?: string;
  teacherCode?: string;
  teacherCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Note Schema for in-memory storage
interface InMemoryNote {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  isShared: boolean;
  teacherCode?: string;
  originalAuthor?: string;
  savedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Models (will be used when MongoDB is available)
const UserSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff'], required: true },
  year: { type: Number },
  semester: { type: Number },
  course: { type: String },
  subject: { type: String },
  teacherCode: { type: String },
  teacherCodes: [{ type: String }]
}, { timestamps: true });

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [{ type: String }],
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  isShared: { type: Boolean, default: false },
  teacherCode: { type: String }
}, { timestamps: true });

let User: any, Note: any;

// Initialize models after connection attempt
async function initializeModels() {
  await connectToMongoDB();
  if (isMongoConnected) {
    User = mongoose.model('User', UserSchema);
    Note = mongoose.model('Note', NoteSchema);
  }
}

// Helper function to generate teacher code
function generateTeacherCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Auth middleware
const auth = (req: any, res: Response, next: any) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// User operations
async function createUser(userData: any): Promise<any> {
  if (isMongoConnected && User) {
    const user = new User(userData);
    return await user.save();
  } else {
    // In-memory storage
    const newUser: InMemoryUser = {
      _id: `user_${userIdCounter++}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryUsers.push(newUser);
    return newUser;
  }
}

async function findUserByRegistrationNumber(registrationNumber: string): Promise<any> {
  if (isMongoConnected && User) {
    return await User.findOne({ registrationNumber });
  } else {
    return inMemoryUsers.find(user => user.registrationNumber === registrationNumber);
  }
}

async function findUserById(userId: string): Promise<any> {
  if (isMongoConnected && User) {
    return await User.findById(userId);
  } else {
    return inMemoryUsers.find(user => user._id === userId);
  }
}

// Note operations
async function createNote(noteData: any): Promise<any> {
  console.log('📝 Creating note with data:', noteData);
  
  if (isMongoConnected && Note) {
    console.log('💾 Using MongoDB for note storage');
    const note = new Note(noteData);
    const savedNote = await note.save();
    console.log('✅ Note saved to MongoDB:', savedNote._id);
    return savedNote;
  } else {
    console.log('🧠 Using in-memory storage for note');
    const newNote: InMemoryNote = {
      _id: `note_${noteIdCounter++}`,
      ...noteData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryNotes.push(newNote);
    console.log('✅ Note saved to memory:', newNote._id);
    console.log('📊 Total notes in memory:', inMemoryNotes.length);
    return newNote;
  }
}

async function findNotes(query: any): Promise<any[]> {
  console.log('🔍 Finding notes with query:', query);
  
  if (isMongoConnected && Note) {
    console.log('💾 Searching MongoDB for notes');
    const notes = await Note.find(query).sort({ updatedAt: -1 });
    console.log('📊 Found notes in MongoDB:', notes.length);
    return notes;
  } else {
    console.log('🧠 Searching in-memory storage for notes');
    let filteredNotes = inMemoryNotes;
    
    // Apply query filters for in-memory search
    if (query.$or) {
      // Handle complex OR query
      filteredNotes = inMemoryNotes.filter(note => {
        return query.$or.some((condition: any) => {
          if (condition.authorId) {
            return note.authorId === condition.authorId;
          }
          if (condition.isShared && condition.teacherCode && condition.teacherCode.$in) {
            return note.isShared && condition.teacherCode.$in.includes(note.teacherCode);
          }
          return false;
        });
      });
    } else if (query.authorId && query.isShared !== undefined) {
      // Search for notes by specific author with specific sharing status
      filteredNotes = inMemoryNotes.filter(note => 
        note.authorId === query.authorId && note.isShared === query.isShared
      );
    } else if (query.authorId) {
      filteredNotes = inMemoryNotes.filter(note => note.authorId === query.authorId);
    } else if (query.isShared !== undefined) {
      filteredNotes = inMemoryNotes.filter(note => note.isShared === query.isShared);
    }
    
    // Sort by updatedAt (newest first)
    filteredNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    console.log('📊 Found notes in memory:', filteredNotes.length);
    console.log('📋 All notes in memory:', inMemoryNotes.map(n => ({ id: n._id, title: n.title, authorId: n.authorId, isShared: n.isShared, teacherCode: n.teacherCode })));
    return filteredNotes;
  }
}

// Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    mongodb: isMongoConnected ? 'Connected' : 'Disconnected (using in-memory storage)',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/register', [
  body('registrationNumber').isLength({ min: 3 }).withMessage('Registration number must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'staff']).withMessage('Role must be student or staff')
], async (req: Request, res: Response) => {
  try {
    console.log('📝 Registration attempt:', { ...req.body, password: '[HIDDEN]' });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registrationNumber, password, role, year, semester, course, subject, teacherCode } = req.body;

    // Check if user already exists
    const existingUser = await findUserByRegistrationNumber(registrationNumber);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepare user data
    const userData: any = {
      registrationNumber,
      password: hashedPassword,
      role
    };

    if (role === 'student') {
      userData.year = year;
      userData.semester = semester;
      userData.course = course;
      if (teacherCode) {
        userData.teacherCodes = [teacherCode];
      }
    } else if (role === 'staff') {
      userData.subject = subject;
      userData.teacherCode = generateTeacherCode();
    }

    const user = await createUser(userData);

    // Generate JWT token
    const payload = {
      id: user._id,
      registrationNumber: user.registrationNumber,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        registrationNumber: user.registrationNumber,
        role: user.role,
        teacherCode: user.teacherCode
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', [
  body('registrationNumber').notEmpty().withMessage('Registration number is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    console.log('🔐 Login attempt:', req.body.registrationNumber);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registrationNumber, password } = req.body;

    const user = await findUserByRegistrationNumber(registrationNumber);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      id: user._id,
      registrationNumber: user.registrationNumber,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        registrationNumber: user.registrationNumber,
        role: user.role,
        teacherCode: user.teacherCode
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Notes routes
app.get('/api/notes', auth, async (req: any, res: Response) => {
  try {
    console.log('📖 Fetching notes for user:', req.user.id);
    
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query: any;

    if (user.role === 'staff') {
      query = { authorId: req.user.id };
    } else {
      const userTeacherCodes = user.teacherCodes || [];
      query = {
        $or: [
          { authorId: req.user.id },
          { 
            isShared: true,
            teacherCode: { $in: userTeacherCodes }
          }
        ]
      };
    }

    const notes = await findNotes(query);
    console.log('📊 Returning notes:', notes.length);
    res.json(notes);
  } catch (error: any) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/notes', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], async (req: any, res: Response) => {
  try {
    console.log('📝 Creating new note for user:', req.user.id);
    console.log('📝 Note data:', { title: req.body.title, contentLength: req.body.content?.length, tags: req.body.tags, shared: req.body.shared });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, shared } = req.body;
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User details:', { role: user.role, teacherCode: user.teacherCode });

    const noteData: any = {
      title,
      content,
      tags: tags || [],
      authorId: req.user.id,
      authorName: user.registrationNumber,
      isShared: false
    };

    // For staff users, automatically share notes if shared flag is true
    if (user.role === 'staff' && shared) {
      noteData.isShared = true;
      noteData.teacherCode = user.teacherCode;
      console.log('📤 Note will be shared with teacher code:', user.teacherCode);
    }

    const note = await createNote(noteData);
    console.log('✅ Note created successfully:', note._id);
    
    res.status(201).json(note);
  } catch (error: any) {
    console.error('❌ Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search staff notes by registration number
app.get('/api/notes/search/:staffId', auth, async (req: any, res: Response) => {
  try {
    const { staffId } = req.params;
    console.log('🔍 Searching for notes by staff ID:', staffId);
    
    // Find the staff user by registration number
    const staffUser = await findUserByRegistrationNumber(staffId);
    if (!staffUser) {
      console.log('❌ Staff user not found:', staffId);
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    if (staffUser.role !== 'staff') {
      console.log('❌ User is not staff:', staffId);
      return res.status(400).json({ message: 'The provided ID does not belong to a staff member' });
    }

    console.log('👨‍🏫 Found staff user:', { 
      id: staffUser._id, 
      registrationNumber: staffUser.registrationNumber, 
      subject: staffUser.subject,
      teacherCode: staffUser.teacherCode 
    });

    // Find shared notes by this staff member
    const notes = await findNotes({ 
      authorId: staffUser._id, 
      isShared: true 
    });

    console.log('📋 Found shared notes:', notes.length);
    
    const response = {
      notes: notes,
      teacherInfo: {
        name: staffUser.registrationNumber,
        subject: staffUser.subject,
        teacherCode: staffUser.teacherCode
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ Search staff notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save a searched note to student's account
app.post('/api/notes/save/:noteId', auth, async (req: any, res: Response) => {
  try {
    const { noteId } = req.params;
    console.log('💾 Student saving note:', noteId, 'to user:', req.user.id);
    
    // Find the original note
    let originalNote;
    if (isMongoConnected && Note) {
      originalNote = await Note.findById(noteId);
    } else {
      originalNote = inMemoryNotes.find(note => note._id === noteId);
    }

    if (!originalNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!originalNote.isShared) {
      return res.status(403).json({ message: 'This note is not shared' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a copy of the note for the student
    const noteData = {
      title: `[Saved] ${originalNote.title}`,
      content: originalNote.content,
      tags: originalNote.tags || [],
      authorId: req.user.id,
      authorName: user.registrationNumber,
      isShared: false,
      originalAuthor: originalNote.authorName,
      savedFrom: originalNote.teacherCode
    };

    const savedNote = await createNote(noteData);
    console.log('✅ Note saved to student account:', savedNote._id);
    
    res.status(201).json(savedNote);
  } catch (error: any) {
    console.error('❌ Save note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initialize and start server
async function startServer() {
  await initializeModels();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Storage: ${isMongoConnected ? 'MongoDB' : 'In-Memory (fallback)'}`);
    console.log(`🔗 Frontend URL: http://localhost:3000`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
