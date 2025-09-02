const express = require('express');
const cors = require('cors');
// Load env for S3 configuration
try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}
let AWS = null;
try { AWS = require('aws-sdk'); } catch (_) { AWS = null; }
const app = express();
const PORT = 5003;

// --- Error Handling ---
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
// Increase limits to support larger canvas images and file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- In-Memory Storage ---
const users = [];
const notes = [];
const files = [];
const whiteboards = [];
let userIdCounter = 1;
let noteIdCounter = 1;
let fileIdCounter = 1;
let whiteboardIdCounter = 1;

// --- Helper Functions ---
// Parse data URL (base64) to Buffer and mime
const parseDataUrl = (dataUrl) => {
  const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  const mimeType = match[1] || 'application/octet-stream';
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, mimeType };
};

// Initialize S3 client if config is present
const getS3Client = () => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = process.env;
  if (!AWS || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) return null;
  AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, region: AWS_REGION });
  return new AWS.S3({ signatureVersion: 'v4' });
};

// Upload a data URL to S3 and return public URL
const uploadDataUrlToS3 = async ({ dataUrl, filename, userPrefix }) => {
  try {
    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    if (!s3 || !bucket || !region) return null; // Not configured
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;
    const keySafeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${userPrefix || 'uploads'}/${Date.now()}_${keySafeName}`;
    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: parsed.buffer,
        ContentType: parsed.mimeType,
        ACL: 'public-read',
      })
      .promise();
  // Construct public URL: encode path segments, keep '/'
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
    return url;
  } catch (err) {
    console.error('S3 upload failed:', err.message || err);
    return null;
  }
};

const getUserFromToken = (authHeader) => {
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token || !token.startsWith('mock_jwt_')) return null;
  
  const parts = token.split('_');
  if (parts.length < 3) return null;
  const userId = parseInt(parts[2], 10);
  return users.find(u => u.id === userId) || null;
};

// --- Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { registrationNumber, password, role, year, semester, course, subject } = req.body;
    
    if (!registrationNumber || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (users.find(u => u.registrationNumber === registrationNumber)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = {
      id: userIdCounter++,
      registrationNumber,
      password, // In real app, this should be hashed
      role,
      year,
      semester,
      course,
      subject,
      connectedStaff: role === 'student' ? [] : undefined
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

// Return current user from token (used by frontend to restore session)
app.get('/api/auth/me', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.json({ user: { ...user, password: undefined } });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({ message: 'Failed to fetch current user' });
  }
});

// Student connects to staff by staff registrationNumber
app.post('/api/auth/connect-staff', (req, res) => {
    const { studentId, staffId } = req.body; // staffId is registrationNumber
    const student = users.find(u => u.id === studentId && u.role === 'student');
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    
    if (!student || !staff) {
        return res.status(404).json({ message: 'Student or Staff not found' });
    }
    if (!student.connectedStaff) student.connectedStaff = [];
    if (!student.connectedStaff.includes(staff.registrationNumber)) {
        student.connectedStaff.push(staff.registrationNumber);
    }
    console.log(`Student ${student.registrationNumber} connected to staff ${staff.registrationNumber}`);
    res.json({ message: 'Connected to staff successfully', staffId: staff.registrationNumber });
});

// Staff management routes for students
app.get('/api/staff/connected', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'student') return res.json([]);

    const connected = (user.connectedStaff || []).map(reg => {
      const staff = users.find(u => u.registrationNumber === reg && u.role === 'staff');
      if (!staff) return null;
      const notesCount = notes.filter(n => n.createdById === staff.id && n.shared).length;
      return { _id: `staff-${staff.id}`, registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', notesCount };
    }).filter(Boolean);
    return res.json(connected);
  } catch (err) {
    console.error('Fetch connected staff error:', err);
    return res.status(500).json({ message: 'Failed to fetch connected staff' });
  }
});

app.get('/api/staff/search/:id', (req, res) => {
  const staff = users.find(u => u.registrationNumber === req.params.id && u.role === 'staff');
  if (!staff) return res.status(404).json({ message: 'Staff not found' });
  return res.json({ _id: `staff-${staff.id}`, registrationNumber: staff.registrationNumber, subject: staff.subject || 'General' });
});

app.post('/api/staff/add-staff', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'student') return res.status(403).json({ message: 'Only students can add staff' });
    const { staffId } = req.body;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (!user.connectedStaff) user.connectedStaff = [];
    if (user.connectedStaff.includes(staff.registrationNumber)) {
      return res.status(400).json({ message: 'Staff already connected' });
    }
    user.connectedStaff.push(staff.registrationNumber);
    console.log(`Student ${user.registrationNumber} added staff ${staff.registrationNumber}`);
    return res.json({ message: 'Staff connected' });
  } catch (err) {
    console.error('Add staff error:', err);
    return res.status(500).json({ message: 'Failed to add staff' });
  }
});

app.delete('/api/staff/remove-staff/:staffId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'student') return res.status(403).json({ message: 'Only students can remove staff' });
    const staffId = req.params.staffId;
    user.connectedStaff = (user.connectedStaff || []).filter(reg => reg !== staffId);
    console.log(`Student ${user.registrationNumber} removed staff ${staffId}`);
    return res.json({ message: 'Staff removed' });
  } catch (err) {
    console.error('Remove staff error:', err);
    return res.status(500).json({ message: 'Failed to remove staff' });
  }
});


// Notes routes
app.get('/api/notes', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`Fetching notes for user: ${user.registrationNumber}`);

    let userNotes = [];
    if (user.role === 'staff') {
      userNotes = notes.filter(note => note.createdById === user.id);
    } else { // Student
      const ownNotes = notes.filter(note => note.createdById === user.id);
      const connectedStaffRegNumbers = user.connectedStaff || [];
      
      const sharedNotes = notes.filter(note => 
        note.shared && 
        note.createdByRole === 'staff' &&
        connectedStaffRegNumbers.includes(note.createdByName)
      );
      userNotes = [...ownNotes, ...sharedNotes];
    }
    
    console.log(`Found ${userNotes.length} notes for user ${user.registrationNumber}`);
    res.json(userNotes);
  } catch (error) {
    console.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Creating note for user:', user.registrationNumber);
    const { title, content, tags, shared } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const note = {
      _id: noteIdCounter++,
      title,
      content,
      tags: tags || [],
      shared: user.role === 'staff' ? !!shared : false,
      createdById: user.id,
      createdByName: user.registrationNumber,
      createdByRole: user.role,
      createdBySubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(note);
    console.log('Note created successfully:', note);
    res.status(201).json(note);
  } catch (error) {
    console.error('Note creation error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Search shared notes by staff registrationNumber (for students)
app.get('/api/notes/search/:staffId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const sharedNotes = notes.filter(n =>
      n.createdByRole === 'staff' && n.shared && n.createdByName === staff.registrationNumber
    );

    const teacherInfo = {
      registrationNumber: staff.registrationNumber,
      subject: staff.subject || 'General',
      notesCount: sharedNotes.length
    };

    return res.json({ notes: sharedNotes, teacherInfo });
  } catch (err) {
    console.error('Notes search error:', err);
    return res.status(500).json({ message: 'Failed to search notes' });
  }
});

// Save a shared note into the student's own notes
app.post('/api/notes/save/:noteId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const noteId = parseInt(req.params.noteId, 10);
    const source = notes.find(n => n._id === noteId);
    if (!source) return res.status(404).json({ message: 'Note not found' });
    if (!(source.shared && source.createdByRole === 'staff')) {
      return res.status(400).json({ message: 'Note is not a shared staff note' });
    }

    const copy = {
      _id: noteIdCounter++,
      title: source.title,
      content: source.content,
      tags: Array.isArray(source.tags) ? [...source.tags] : [],
      shared: false,
      createdById: user.id,
      createdByName: user.registrationNumber,
      createdByRole: user.role,
  // Preserve origin metadata for display in student's notepad
  originStaffId: source.createdByName,
  originStaffSubject: source.createdBySubject,
  originNoteId: source._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.unshift(copy);
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save searched note error:', err);
    return res.status(500).json({ message: 'Failed to save note' });
  }
});

// Files (PDF/PPT) routes
app.get('/api/files', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    let userFiles = [];
    if (user.role === 'staff') {
      userFiles = files.filter(f => f.ownerId === user.id);
    } else {
      const own = files.filter(f => f.ownerId === user.id);
      const connected = user.connectedStaff || [];
      const shared = files.filter(f => f.isShared && f.ownerRole === 'staff' && connected.includes(f.ownerName));
      userFiles = [...own, ...shared];
    }

    return res.json(userFiles);
  } catch (err) {
    console.error('Files fetch error:', err);
    return res.status(500).json({ message: 'Failed to fetch files' });
  }
});

app.post('/api/files/upload', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { filename, fileData, isShared } = req.body || {};
    if (!filename || !fileData) return res.status(400).json({ message: 'filename and fileData are required' });

    const title = filename.replace(/\.[^/.]+$/, '');

    // Try S3 upload when configured; fallback to data URL
    let publicUrl = null;
    uploadDataUrlToS3({ dataUrl: fileData, filename, userPrefix: user.registrationNumber })
      .then((url) => {
        publicUrl = url;
      })
      .catch(() => {})
      .finally(() => {
        const file = {
          id: String(fileIdCounter++),
          title,
          filename,
          // If S3 URL available, prefer it; keep data URL as fallback for local dev
          fileData: publicUrl ? undefined : fileData,
          fileUrl: publicUrl || fileData,
          ownerId: user.id,
          ownerName: user.registrationNumber,
          ownerRole: user.role,
          ownerSubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
          isShared: user.role === 'staff' ? !!isShared : false,
          annotations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        files.unshift(file);
        console.log('File uploaded:', { id: file.id, filename: file.filename, by: user.registrationNumber, to: publicUrl ? 'S3' : 'local' });
        return res.status(201).json(file);
      });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
});

app.put('/api/files/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const id = String(req.params.id);
    const idx = files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ message: 'File not found' });
    const file = files[idx];
    if (file.ownerId !== user.id) return res.status(403).json({ message: 'Forbidden: not owner' });

    const { annotations, isShared } = req.body || {};
    files[idx] = {
      ...file,
      annotations: Array.isArray(annotations) ? annotations : file.annotations,
      isShared: file.ownerRole === 'staff' ? (isShared !== undefined ? !!isShared : file.isShared) : false,
      updatedAt: new Date().toISOString()
    };
    console.log('File updated:', { id });
    return res.json(files[idx]);
  } catch (err) {
    console.error('File update error:', err);
    return res.status(500).json({ message: 'Failed to update file' });
  }
});

app.delete('/api/files/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const id = String(req.params.id);
    const idx = files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ message: 'File not found' });
    const file = files[idx];
    if (file.ownerId !== user.id) return res.status(403).json({ message: 'Forbidden: not owner' });
    files.splice(idx, 1);
    console.log('File deleted:', { id });
    return res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('File delete error:', err);
    return res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Search shared files by staff registrationNumber (for students)
app.get('/api/files/search/:staffId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    const shared = files.filter(f => f.isShared && f.ownerRole === 'staff' && f.ownerName === staff.registrationNumber);
    const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', filesCount: shared.length };
    return res.json({ files: shared, teacherInfo });
  } catch (err) {
    console.error('Files search error:', err);
    return res.status(500).json({ message: 'Failed to search files' });
  }
});

// Save a shared staff file into the student's own files
app.post('/api/files/save/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const id = String(req.params.id);
    const source = files.find(f => f.id === id);
    if (!source) return res.status(404).json({ message: 'File not found' });
    if (!(source.isShared && source.ownerRole === 'staff')) {
      return res.status(400).json({ message: 'File is not a shared staff file' });
    }
    const copy = {
      ...source,
      id: String(fileIdCounter++),
      ownerId: user.id,
      ownerName: user.registrationNumber,
      ownerRole: user.role,
      ownerSubject: undefined,
      isShared: false,
      annotations: Array.isArray(source.annotations) ? [...source.annotations] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    files.unshift(copy);
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save shared file error:', err);
    return res.status(500).json({ message: 'Failed to save file' });
  }
});

// Whiteboard routes
app.get('/api/whiteboards', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    let result = [];
    if (user.role === 'staff') {
      result = whiteboards.filter(w => w.ownerId === user.id);
    } else {
      const own = whiteboards.filter(w => w.ownerId === user.id);
      const connected = user.connectedStaff || [];
      const shared = whiteboards.filter(w => w.isShared && w.ownerRole === 'staff' && connected.includes(w.ownerName));
      result = [...own, ...shared];
    }
    return res.json(result);
  } catch (err) {
    console.error('Whiteboards fetch error:', err);
    return res.status(500).json({ message: 'Failed to fetch whiteboards' });
  }
});

app.post('/api/whiteboards', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { title, imageData, isShared } = req.body || {};
    if (!title || !imageData) return res.status(400).json({ message: 'title and imageData are required' });

    const wb = {
      id: String(whiteboardIdCounter++),
      title,
      imageData, // data URL (png)
      ownerId: user.id,
      ownerName: user.registrationNumber,
      ownerRole: user.role,
  ownerSubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
      isShared: user.role === 'staff' ? !!isShared : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    whiteboards.unshift(wb);
    console.log('Whiteboard saved:', { id: wb.id, by: user.registrationNumber });
    return res.status(201).json(wb);
  } catch (err) {
    console.error('Whiteboard save error:', err);
    return res.status(500).json({ message: 'Failed to save whiteboard' });
  }
});

app.delete('/api/whiteboards/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const id = String(req.params.id);
    const idx = whiteboards.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ message: 'Whiteboard not found' });
    const wb = whiteboards[idx];
    if (wb.ownerId !== user.id) return res.status(403).json({ message: 'Forbidden: not owner' });
    whiteboards.splice(idx, 1);
    console.log('Whiteboard deleted:', { id });
    return res.json({ message: 'Whiteboard deleted' });
  } catch (err) {
    console.error('Whiteboard delete error:', err);
    return res.status(500).json({ message: 'Failed to delete whiteboard' });
  }
});

// Search shared whiteboards by staff registrationNumber (for students)
app.get('/api/whiteboards/search/:staffId', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    const shared = whiteboards.filter(w => w.isShared && w.ownerRole === 'staff' && w.ownerName === staff.registrationNumber);
    const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', drawingsCount: shared.length };
    return res.json({ drawings: shared, teacherInfo });
  } catch (err) {
    console.error('Whiteboards search error:', err);
    return res.status(500).json({ message: 'Failed to search whiteboards' });
  }
});

// Save a shared staff whiteboard into the student's own drawings
app.post('/api/whiteboards/save/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const id = String(req.params.id);
    const source = whiteboards.find(w => w.id === id);
    if (!source) return res.status(404).json({ message: 'Whiteboard not found' });
    if (!(source.isShared && source.ownerRole === 'staff')) {
      return res.status(400).json({ message: 'Whiteboard is not a shared staff drawing' });
    }
    const copy = {
      ...source,
      id: String(whiteboardIdCounter++),
      ownerId: user.id,
      ownerName: user.registrationNumber,
      ownerRole: user.role,
      ownerSubject: undefined,
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    whiteboards.unshift(copy);
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save shared whiteboard error:', err);
    return res.status(500).json({ message: 'Failed to save whiteboard' });
  }
});

// Update an existing note (owner only)
app.put('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = parseInt(req.params.id, 10);
    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const idx = notes.findIndex(n => n._id === noteId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = notes[idx];
    if (note.createdById !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
    }

    const { title, content, tags, shared } = req.body || {};
    const updated = {
      ...note,
      title: typeof title === 'string' && title.length ? title : note.title,
      content: typeof content === 'string' && content.length ? content : note.content,
      tags: Array.isArray(tags) ? tags : note.tags,
      // Only staff can set shared flag; students' notes remain unshared
      shared: note.createdByRole === 'staff' ? (shared !== undefined ? !!shared : note.shared) : false,
      updatedAt: new Date().toISOString()
    };

    notes[idx] = updated;
    console.log('Note updated successfully:', updated);
    return res.json(updated);
  } catch (error) {
    console.error('Note update error:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note (owner only)
app.delete('/api/notes/:id', (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = parseInt(req.params.id, 10);
    if (Number.isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const idx = notes.findIndex(n => n._id === noteId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = notes[idx];
    if (note.createdById !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
    }

    const [deleted] = notes.splice(idx, 1);
    console.log('Note deleted successfully:', deleted);
    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Note deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server startup error:', err);
});
