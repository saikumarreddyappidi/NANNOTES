import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NANNOTES API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic API routes (without database for now)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to NANNOTES API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      notes: '/api/notes',
      files: '/api/files'
    }
  });
});

// In-memory user storage for demo (replace with MongoDB in production)
const users: any[] = [];
let userIdCounter = 1;

// Auth endpoints with mock JWT functionality
app.post('/api/auth/register', (req, res) => {
  try {
    const { registrationNumber, password, role, year, semester, course, teacherCode, subject } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.registrationNumber === registrationNumber);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const newUser = {
      _id: userIdCounter++,
      registrationNumber,
      password, // In production, hash this!
      role,
      year: role === 'student' ? year : year,
      semester: role === 'student' ? semester : semester,
      course: role === 'student' ? course : undefined,
      subject: role === 'staff' ? subject : undefined,
      teacherCode: role === 'staff' ? (teacherCode || `TC${Math.random().toString(36).substr(2, 8).toUpperCase()}`) : undefined,
      connectedTeachers: role === 'student' ? [] : undefined,
      createdAt: new Date().toISOString()
    };
    
    // If student provided a teacher code, connect them automatically
    if (role === 'student' && teacherCode && teacherCode.trim()) {
      const teacher = users.find(u => u.role === 'staff' && u.teacherCode === teacherCode.trim());
      if (teacher) {
        (newUser as any).connectedTeachers = [teacherCode.trim()];
      }
    }
    
    users.push(newUser);
    
    // Create mock JWT token
    const token = `mock_jwt_${newUser._id}_${Date.now()}`;
    
    // Return user without password
    const { password: _, ...userResponse } = newUser;
    
    res.status(201).json({
      message: 'Registration successful',
      user: userResponse,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { registrationNumber, password } = req.body;
    
    // Find user by registration number (for students) or teacher code (for staff)
    const user = users.find(u => 
      u.registrationNumber === registrationNumber || 
      (u.role === 'staff' && u.teacherCode === registrationNumber)
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password (in production, compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create mock JWT token
    const token = `mock_jwt_${user._id}_${Date.now()}`;
    
    // Return user without password
    const { password: _, ...userResponse } = user;
    
    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error });
  }
});

// Teacher code search endpoint
app.post('/api/auth/connect-teacher', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can connect to teachers' });
    }

    const { teacherCode } = req.body;
    
    // Find teacher by teacher code
    const teacher = users.find(u => u.role === 'staff' && u.teacherCode === teacherCode);
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher code not found' });
    }

    // Update student's connected teachers list
    const userIndex = users.findIndex(u => u._id === user._id);
    if (userIndex !== -1) {
      if (!users[userIndex].connectedTeachers) {
        users[userIndex].connectedTeachers = [];
      }
      
      if (!users[userIndex].connectedTeachers.includes(teacherCode)) {
        users[userIndex].connectedTeachers.push(teacherCode);
      }
    }

    res.json({
      message: 'Successfully connected to teacher',
      teacherName: teacher.registrationNumber,
      teacherSubject: teacher.subject
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to teacher', details: error });
  }
});
app.get('/api/auth/me', (req, res) => {
  try {
    // Mock token validation (in production, verify JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Extract user ID from mock token
    const tokenParts = token.split('_');
    if (tokenParts.length < 3 || tokenParts[0] !== 'mock' || tokenParts[1] !== 'jwt') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = parseInt(tokenParts[2]);
    const user = users.find(u => u._id === userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Return user without password
    const { password: _, ...userResponse } = user;
    
    res.json({
      user: userResponse
    });
  } catch (error) {
    res.status(401).json({ error: 'Token validation failed', details: error });
  }
});

// In-memory notes storage for demo
const notes: any[] = [];
let noteIdCounter = 1;

// Helper function to get user from token
const getUserFromToken = (authHeader: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const tokenParts = token.split('_');
  
  if (tokenParts.length < 3 || tokenParts[0] !== 'mock' || tokenParts[1] !== 'jwt') {
    return null;
  }
  
  const userId = parseInt(tokenParts[2]);
  return users.find(u => u._id === userId);
};

// Notes endpoints
app.get('/api/notes', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    let userNotes = [];
    
    if (user.role === 'student') {
      // Get student's own notes
      userNotes = notes.filter(note => note.author === user._id);
      
      // Get shared notes from connected teachers
      if (user.connectedTeachers && user.connectedTeachers.length > 0) {
        const connectedTeacherIds = users
          .filter(u => u.role === 'staff' && user.connectedTeachers.includes(u.teacherCode))
          .map(u => u._id);
        
        const sharedNotes = notes.filter(note => 
          connectedTeacherIds.includes(note.author) && note.isShared
        );
        
        userNotes = [...userNotes, ...sharedNotes];
      }
    } else {
      // For staff, get their own notes
      userNotes = notes.filter(note => note.author === user._id);
    }
    
    res.json({ notes: userNotes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes', details: error });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { title, content, tags } = req.body;
    
    const newNote = {
      _id: noteIdCounter++,
      title,
      content,
      tags: tags || [],
      author: user._id,
      authorName: user.registrationNumber,
      isShared: user.role === 'staff', // Staff notes are automatically shared
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    notes.push(newNote);
    
    res.status(201).json({ 
      message: 'Note created successfully',
      note: newNote 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note', details: error });
  }
});

app.put('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const noteId = parseInt(req.params.id);
    const noteIndex = notes.findIndex(note => note._id === noteId && note.author === user._id);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    const { title, content, tags } = req.body;
    
    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title || notes[noteIndex].title,
      content: content || notes[noteIndex].content,
      tags: tags || notes[noteIndex].tags,
      updatedAt: new Date().toISOString()
    };
    
    res.json({ 
      message: 'Note updated successfully',
      note: notes[noteIndex] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note', details: error });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const noteId = parseInt(req.params.id);
    const noteIndex = notes.findIndex(note => note._id === noteId && note.author === user._id);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    notes.splice(noteIndex, 1);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note', details: error });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found` 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`💓 Health check: http://localhost:${PORT}/api/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 Frontend URL: http://localhost:3000`);
  }
});

export default app;
