const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5003;

// Error handling middleware
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple in-memory storage
const users = [];
const notes = [];

// Health check
app.get('/api/health', (req, res) => {
  try {
    console.log('Health check endpoint hit');
    res.json({ 
      status: 'OK', 
      message: 'Server is running!', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Basic auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { registrationNumber, password, role, year, semester, course, subject } = req.body;
    
    if (!registrationNumber || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const existingUser = users.find(u => u.registrationNumber === registrationNumber);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = {
      id: users.length + 1,
      registrationNumber,
      password, // In real app, this should be hashed
      role,
      year,
      semester,
      course,
      subject,
      teacherCode: role === 'staff' ? `TC${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null
    };

    users.push(user);
    console.log('User registered successfully:', user.registrationNumber);
    
    res.status(201).json({ 
      message: 'Registration successful', 
      user: { ...user, password: undefined },
      token: `mock_jwt_${user.id}_${Date.now()}`
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { registrationNumber, password } = req.body;
    
    if (!registrationNumber || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    const user = users.find(u => u.registrationNumber === registrationNumber && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User logged in successfully:', user.registrationNumber);
    res.json({ 
      message: 'Login successful', 
      user: { ...user, password: undefined },
      token: `mock_jwt_${user.id}_${Date.now()}`
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Notes routes
app.get('/api/notes/my', (req, res) => {
  try {
    console.log('Fetching user notes');
    // For now, return all notes - in real app, filter by user
    res.json({ notes: notes });
  } catch (error) {
    console.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    console.log('Creating note:', req.body);
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const note = {
      _id: notes.length + 1,
      title,
      content,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(note);
    console.log('Note created successfully:', note._id);
    res.status(201).json({ message: 'Note created successfully', note });
  } catch (error) {
    console.error('Note creation error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`💓 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL: http://localhost:3000`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});
