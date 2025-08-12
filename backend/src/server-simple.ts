import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// import { initSentry, setupSentryErrorHandler } from './sentry';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Initialize Sentry first (commented out until packages installed)
// initSentry(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://nannotes-frontend.up.railway.app',
        'https://your-custom-domain.com',
        /^https:\/\/.*\.railway\.app$/,
        /^https:\/\/.*\.vercel\.app$/
      ]
    : [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:3002', 
        'http://localhost:3003',
        'http://localhost:60464',
        'http://localhost:60700',
        'http://localhost:59334',
        'http://localhost:3004',
        'http://localhost:3005'
      ],
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

// In-memory storage for demo (replace with MongoDB in production)
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
      connectedTeachers: role === 'student' ? [] : undefined, // Start with empty array for students
      createdAt: new Date().toISOString()
    };
    
    // Note: Students must manually connect to teachers using teacher codes after registration
    
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

// In-memory whiteboards storage for demo
const whiteboards: any[] = [];
let whiteboardIdCounter = 1;

// In-memory files storage for demo
const files: any[] = [];
let fileIdCounter = 1;

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

// Simple endpoint: GET /api/notes/{staffId}
// This matches exactly the pseudocode you provided
app.get('/api/notes/:staffId', (req, res) => {
  try {
    // 1. Get the staffId from the URL (e.g., "Staff123")
    const staffId = req.params.staffId;
    
    // 2. Find all notes in the database where the 'AuthorID' matches the staffId
    // In our case, we use registrationNumber as the staffId and createdById as AuthorID
    
    // First, find the staff member by their registration number (staffId)
    const staffMember = users.find(u => u.role === 'staff' && u.registrationNumber === staffId);
    
    if (!staffMember) {
      // If staff member doesn't exist, return empty array (no notes found)
      return res.json([]);
    }
    
    // Find all notes where AuthorID (createdById) matches the staff member's ID
    const staffNotes = notes.filter(note => note.createdById === staffMember._id);
    
    // 3. Return the found notes as JSON data
    // If no notes are found, this will correctly return an empty list: []
    res.json(staffNotes);
  } catch (error) {
    // Return empty array on error to match expected behavior
    res.json([]);
  }
});

// Get user's own notes (for dashboard and notepad)
app.get('/api/notes/my', (req, res) => {
  try {
    console.log('🔍 GET /api/notes/my called');
    console.log('🔑 Authorization header:', req.headers.authorization);
    
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      console.log('❌ No user found from token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('👤 User found:', { id: user._id, name: user.registrationNumber, role: user.role });
    
    // Get only notes created by this user
    const userNotes = notes.filter(note => note.createdById === user._id);
    
    console.log('📝 Total notes in database:', notes.length);
    console.log('👤 User notes found:', userNotes.length);
    console.log('📋 User notes:', userNotes);
    
    res.json({ notes: userNotes });
  } catch (error) {
    console.error('❌ Error in GET /api/notes/my:', error);
    res.status(500).json({ error: 'Failed to fetch notes', details: error });
  }
});

// Search notes by teacher's registration number (for students only)
app.get('/api/notes/search/:staffId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can search for teacher notes' });
    }

    const { staffId } = req.params;
    
    // Find teacher by registration number (their unique ID)
    const teacher = users.find(u => u.role === 'staff' && u.registrationNumber === staffId);
    
    if (!teacher) {
      return res.status(404).json({ 
        error: 'No notes found for this ID',
        message: 'Teacher ID not found or teacher has no notes available'
      });
    }

    // Get only SHARED notes from this teacher
    const teacherNotes = notes.filter(note => 
      note.createdById === teacher._id && 
      note.createdByRole === 'staff' &&
      note.shared === true // Only shared notes can be searched
    );

    if (teacherNotes.length === 0) {
      return res.status(404).json({ 
        error: 'No notes found for this ID',
        message: 'This teacher has not shared any notes yet'
      });
    }

    res.json({ 
      notes: teacherNotes,
      teacherInfo: {
        name: teacher.registrationNumber,
        subject: teacher.subject,
        totalNotes: teacherNotes.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search notes', details: error });
  }
});

// Save a searched note to student's account
app.post('/api/notes/save/:noteId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can save searched notes' });
    }

    const noteId = parseInt(req.params.noteId);
    
    // Find the original note
    const originalNote = notes.find(note => note._id === noteId);
    
    if (!originalNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if it's a shared staff note
    if (originalNote.createdByRole !== 'staff' || !originalNote.shared) {
      return res.status(403).json({ error: 'This note is not available for saving' });
    }

    // Check if student already saved this note
    const alreadySaved = notes.find(note => 
      note.createdById === user._id && 
      note.copiedFromStaffId === originalNote.createdById &&
      note.title === originalNote.title
    );

    if (alreadySaved) {
      return res.status(400).json({ error: 'You have already saved this note' });
    }

    // Create a copy of the note for the student
    const savedNote = {
      _id: noteIdCounter++,
      title: originalNote.title,
      content: originalNote.content,
      tags: originalNote.tags || [],
      createdById: user._id, // Student becomes the owner of the copy
      createdByRole: user.role,
      createdByName: user.registrationNumber,
      shared: false, // Student copies are private by default
      copiedFromStaffId: originalNote.createdById, // Track original staff member
      copiedFromStaffName: originalNote.createdByName,
      originalNoteId: originalNote._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(savedNote);

    res.status(201).json({
      message: 'Note saved to your account successfully',
      note: savedNote
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save note', details: error });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    console.log('📝 POST /api/notes called with body:', req.body);
    
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      console.log('❌ No user found from token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('👤 User creating note:', { id: user._id, name: user.registrationNumber, role: user.role });
    
    const { title, content, tags, shared } = req.body;
    
    const newNote = {
      _id: noteIdCounter++,
      title,
      content,
      tags: tags || [],
      createdById: user._id,
      createdByRole: user.role,
      createdByName: user.registrationNumber,
      shared: user.role === 'staff' ? (shared !== undefined ? shared : false) : false, // Only staff can set shared flag
      copiedFromStaffId: null, // For original notes, this is null
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✨ Creating new note:', newNote);
    
    notes.push(newNote);
    
    console.log('📋 Total notes in database after creation:', notes.length);
    console.log('📋 All notes:', notes.map(n => ({ id: n._id, title: n.title, createdById: n.createdById })));
    
    res.status(201).json({ 
      message: 'Note created successfully',
      note: newNote 
    });
  } catch (error) {
    console.error('❌ Error creating note:', error);
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
    const noteIndex = notes.findIndex(note => note._id === noteId && note.createdById === user._id);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    const { title, content, tags, shared } = req.body;
    
    notes[noteIndex] = {
      ...notes[noteIndex],
      title: title || notes[noteIndex].title,
      content: content || notes[noteIndex].content,
      tags: tags || notes[noteIndex].tags,
      // Only staff can control sharing, students cannot share their copied notes
      shared: user.role === 'staff' ? (shared !== undefined ? shared : notes[noteIndex].shared) : notes[noteIndex].shared,
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
    const noteIndex = notes.findIndex(note => note._id === noteId && note.createdById === user._id);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    notes.splice(noteIndex, 1);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note', details: error });
  }
});

// Whiteboard endpoints
app.get('/api/whiteboards', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    let userWhiteboards = [];
    
    if (user.role === 'student') {
      // Get student's own whiteboards
      userWhiteboards = whiteboards.filter(wb => wb.author === user._id);
      
      // Get shared whiteboards from connected teachers
      if (user.connectedTeachers && user.connectedTeachers.length > 0) {
        const connectedTeacherIds = users
          .filter(u => u.role === 'staff' && user.connectedTeachers.includes(u.teacherCode))
          .map(u => u._id);
        
        const sharedWhiteboards = whiteboards.filter(wb => 
          connectedTeacherIds.includes(wb.author) && wb.isShared
        );
        
        userWhiteboards = [...userWhiteboards, ...sharedWhiteboards];
      }
    } else {
      // For staff, get their own whiteboards
      userWhiteboards = whiteboards.filter(wb => wb.author === user._id);
    }
    
    res.json(userWhiteboards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch whiteboards', details: error });
  }
});

app.post('/api/whiteboards', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { title, imageData, isShared } = req.body;
    
    const newWhiteboard = {
      id: whiteboardIdCounter++,
      title,
      imageData,
      author: user._id,
      authorName: user.registrationNumber,
      isShared: user.role === 'staff' ? (isShared || false) : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    whiteboards.push(newWhiteboard);
    
    res.status(201).json(newWhiteboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save whiteboard', details: error });
  }
});

app.delete('/api/whiteboards/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const whiteboardId = parseInt(req.params.id);
    const whiteboardIndex = whiteboards.findIndex(wb => wb.id === whiteboardId && wb.author === user._id);
    
    if (whiteboardIndex === -1) {
      return res.status(404).json({ error: 'Whiteboard not found or access denied' });
    }
    
    whiteboards.splice(whiteboardIndex, 1);
    
    res.json({ message: 'Whiteboard deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete whiteboard', details: error });
  }
});

// Files/PDF endpoints
app.get('/api/files', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    let userFiles = [];
    
    if (user.role === 'student') {
      // Get student's own files
      userFiles = files.filter(file => file.author === user._id);
      
      // Get shared files from connected teachers
      if (user.connectedTeachers && user.connectedTeachers.length > 0) {
        const connectedTeacherIds = users
          .filter(u => u.role === 'staff' && user.connectedTeachers.includes(u.teacherCode))
          .map(u => u._id);
        
        const sharedFiles = files.filter(file => 
          connectedTeacherIds.includes(file.author) && file.isShared
        );
        
        userFiles = [...userFiles, ...sharedFiles];
      }
    } else {
      // For staff, get their own files
      userFiles = files.filter(file => file.author === user._id);
    }
    
    res.json(userFiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files', details: error });
  }
});

app.post('/api/files/upload', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { filename, fileData, isShared } = req.body;
    
    const newFile = {
      id: fileIdCounter++,
      title: filename.replace('.pdf', ''),
      filename: filename,
      fileData: fileData,
      fileUrl: fileData, // Use base64 data as URL for demo
      author: user._id,
      authorName: user.registrationNumber,
      isShared: user.role === 'staff' ? (isShared || false) : false,
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    files.push(newFile);
    
    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file', details: error });
  }
});

app.put('/api/files/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const fileId = parseInt(req.params.id);
    const fileIndex = files.findIndex(file => file.id === fileId && file.author === user._id);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    const { annotations, isShared } = req.body;
    
    files[fileIndex] = {
      ...files[fileIndex],
      annotations: annotations || files[fileIndex].annotations,
      isShared: user.role === 'staff' ? (isShared !== undefined ? isShared : files[fileIndex].isShared) : files[fileIndex].isShared,
      updatedAt: new Date().toISOString()
    };
    
    res.json(files[fileIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update file', details: error });
  }
});

app.delete('/api/files/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const fileId = parseInt(req.params.id);
    const fileIndex = files.findIndex(file => file.id === fileId && file.author === user._id);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    files.splice(fileIndex, 1);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file', details: error });
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

// Setup Sentry error handler (commented out until packages installed)
// setupSentryErrorHandler(app);

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
