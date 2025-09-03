const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let mongoose = null;
let jwtLib = null;
let bcrypt = null;
try { mongoose = require('mongoose'); } catch (_) { mongoose = null; }
try { jwtLib = require('jsonwebtoken'); } catch (_) { jwtLib = null; }
try { bcrypt = require('bcryptjs'); } catch (_) { bcrypt = null; }
// Load env for S3 configuration
try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}
let AWS = null;
try { AWS = require('aws-sdk'); } catch (_) { AWS = null; }
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5003;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// --- Simple JSON persistence (local fallback DB) ---
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data.json');
const safeWriteFile = (filePath, dataStr) => {
  try {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, dataStr, { encoding: 'utf8' });
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) {
    console.error('Persist error:', e.message || e);
    return false;
  }
};
const persist = () => {
  try {
    const snapshot = {
      users,
      notes,
      files,
      whiteboards,
      counters: { userIdCounter, noteIdCounter, fileIdCounter, whiteboardIdCounter },
      savedAt: new Date().toISOString(),
    };
    safeWriteFile(DATA_PATH, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Persist exception:', e.message || e);
  }
};
const loadData = () => {
  try {
    if (!fs.existsSync(DATA_PATH)) return;
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const json = JSON.parse(raw);
    if (Array.isArray(json.users)) { users.splice(0, users.length, ...json.users); }
    if (Array.isArray(json.notes)) { notes.splice(0, notes.length, ...json.notes); }
    if (Array.isArray(json.files)) { files.splice(0, files.length, ...json.files); }
    if (Array.isArray(json.whiteboards)) { whiteboards.splice(0, whiteboards.length, ...json.whiteboards); }
    if (json.counters) {
      userIdCounter = Number(json.counters.userIdCounter) || userIdCounter;
      noteIdCounter = Number(json.counters.noteIdCounter) || noteIdCounter;
      fileIdCounter = Number(json.counters.fileIdCounter) || fileIdCounter;
      whiteboardIdCounter = Number(json.counters.whiteboardIdCounter) || whiteboardIdCounter;
    }
    console.log('💾 Local data loaded from', DATA_PATH);
  } catch (e) {
    console.error('Load data error:', e.message || e);
  }
};

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

// Load from disk if present
loadData();

// --- Optional MongoDB (Mongoose) setup for Users only ---
let mongoReady = false;
let UserModel = null;
let NoteModel = null;
let FileModel = null;
let WhiteboardModel = null;
if (mongoose) {
  (async () => {
    try {
      const uri = process.env.MONGODB_URI || '';
      if (!uri) {
        console.log('MongoDB URI not set; continuing with JSON persistence');
      } else {
        await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
        const userSchema = new mongoose.Schema({
          registrationNumber: { type: String, required: true, unique: true, trim: true },
          password: { type: String, required: true },
          role: { type: String, enum: ['student', 'staff'], required: true },
          year: String,
          semester: String,
          course: String,
          subject: String,
          connectedStaff: [String],
          createdAt: { type: Date, default: Date.now }
        });
        if (bcrypt) {
          userSchema.pre('save', async function(next) {
            if (!this.isModified('password')) return next();
            try {
              const salt = await bcrypt.genSalt(12);
              this.password = await bcrypt.hash(this.password, salt);
              next();
            } catch (e) { next(e); }
          });
        }
        UserModel = mongoose.model('User', userSchema);
        const noteSchema = new mongoose.Schema({
          title: { type: String, required: true },
          content: { type: String, required: true },
          tags: { type: [String], default: [] },
          shared: { type: Boolean, default: false },
          createdByName: { type: String, required: true }, // registrationNumber
          createdByRole: { type: String, enum: ['student', 'staff'], required: true },
          createdBySubject: { type: String },
          originStaffId: { type: String }, // registrationNumber
          originStaffSubject: { type: String },
          originNoteId: { type: String },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
        noteSchema.index({ createdByName: 1, createdAt: -1 });
        noteSchema.index({ shared: 1, createdByRole: 1, createdByName: 1 });
        NoteModel = mongoose.model('Note', noteSchema);

        const fileSchema = new mongoose.Schema({
          title: { type: String, required: true },
          filename: { type: String, required: true },
          fileUrl: { type: String }, // preferred public URL
          fileData: { type: String }, // data URL fallback
          ownerName: { type: String, required: true },
          ownerRole: { type: String, enum: ['student', 'staff'], required: true },
          ownerSubject: { type: String },
          isShared: { type: Boolean, default: false },
          annotations: { type: Array, default: [] },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
        fileSchema.index({ ownerName: 1, createdAt: -1 });
        fileSchema.index({ isShared: 1, ownerRole: 1, ownerName: 1 });
        FileModel = mongoose.model('File', fileSchema);

        const whiteboardSchema = new mongoose.Schema({
          title: { type: String, required: true },
          imageData: { type: String, required: true }, // data URL
          ownerName: { type: String, required: true },
          ownerRole: { type: String, enum: ['student', 'staff'], required: true },
          ownerSubject: { type: String },
          isShared: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });
        whiteboardSchema.index({ ownerName: 1, createdAt: -1 });
        whiteboardSchema.index({ isShared: 1, ownerRole: 1, ownerName: 1 });
        WhiteboardModel = mongoose.model('Whiteboard', whiteboardSchema);
        mongoReady = true;
        console.log('✅ Connected to MongoDB for Users');
        // Prime in-memory mirror from DB if empty
        const count = users.length;
        const docs = await UserModel.find({}).lean();
        if (count === 0 && docs.length) {
          for (const d of docs) {
            users.push({
              id: userIdCounter++,
              registrationNumber: d.registrationNumber,
              password: d.password, // hashed
              role: d.role,
              year: d.year,
              semester: d.semester,
              course: d.course,
              subject: d.subject,
              connectedStaff: Array.isArray(d.connectedStaff) ? d.connectedStaff : [],
              _mongoId: String(d._id)
            });
          }
          persist();
          console.log(`🔄 Primed in-memory users from Mongo: ${docs.length}`);
        }
      }
    } catch (err) {
      console.warn('MongoDB connection failed; continuing without it:', err.message);
      mongoReady = false;
    }
  })();
}

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
  if (!token) return null;

  // Back-compat: old mock token: mock_jwt_<userId>_<ts>
  if (token.startsWith('mock_jwt_')) {
    const parts = token.split('_');
    if (parts.length < 3) return null;
    const userId = parseInt(parts[2], 10);
    return users.find(u => u.id === userId) || null;
  }

  // New signed token: signed_<userId>.<ts>.<sig>
  if (token.startsWith('signed_')) {
    try {
      const raw = token.slice('signed_'.length);
      const [uidStr, tsStr, sig] = raw.split('.');
      const userId = parseInt(uidStr, 10);
      const ts = parseInt(tsStr, 10);
      if (!userId || !ts || !sig) return null;
      if (Date.now() - ts > TOKEN_TTL_MS) return null; // expired
      const h = crypto.createHmac('sha256', JWT_SECRET).update(`${uidStr}.${tsStr}`).digest('hex');
      if (h !== sig) return null;
      return users.find(u => u.id === userId) || null;
    } catch (_) { return null; }
  }

  // Standard JWT token support
  if (jwtLib && token.split('.').length === 3) {
    try {
      const payload = jwtLib.verify(token, JWT_SECRET);
      // Prefer finding by registrationNumber if present, else by mapped _mongoId
      if (payload && payload.registrationNumber) {
        const found = users.find(u => u.registrationNumber === payload.registrationNumber);
        if (found) return found;
      }
      if (payload && payload.userId) {
        // Try to map mongo id to in-memory mirror
        const found = users.find(u => u._mongoId === String(payload.userId));
        if (found) return found;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const createSignedToken = (userId) => {
  const ts = Date.now().toString();
  const payload = `${userId}.${ts}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `signed_${payload}.${sig}`;
};

const createJwtToken = (user) => {
  if (!jwtLib) return null;
  const payload = {
    userId: user._mongoId ? user._mongoId : user.id,
    registrationNumber: user.registrationNumber,
    role: user.role
  };
  return jwtLib.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

const mirrorMongoUserIntoMemory = (doc) => {
  // If already mirrored, return it
  const existing = users.find(u => u._mongoId === String(doc._id) || u.registrationNumber === doc.registrationNumber);
  if (existing) return existing;
  const newUser = {
    id: userIdCounter++,
    registrationNumber: doc.registrationNumber,
    password: doc.password,
    role: doc.role,
    year: doc.year,
    semester: doc.semester,
    course: doc.course,
    subject: doc.subject,
    connectedStaff: Array.isArray(doc.connectedStaff) ? doc.connectedStaff : [],
    _mongoId: String(doc._id)
  };
  users.push(newUser);
  persist();
  return newUser;
};

// --- Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { registrationNumber, password, role, year, semester, course, subject } = req.body || {};

    if (!registrationNumber || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If Mongo ready, register there first
    if (mongoReady && UserModel) {
      const existing = await UserModel.findOne({ registrationNumber });
      if (existing) return res.status(400).json({ error: 'User already exists' });
      const doc = new UserModel({
        registrationNumber,
        password,
        role,
        year,
        semester,
        course,
        subject,
        connectedStaff: role === 'student' ? [] : undefined
      });
      await doc.save();
      const mirrored = mirrorMongoUserIntoMemory(doc.toObject());
      const token = createJwtToken(mirrored) || createSignedToken(mirrored.id);
      console.log('User registered successfully (Mongo):', mirrored.registrationNumber);
      return res.status(201).json({
        message: 'Registration successful',
        user: { ...mirrored, password: undefined },
        token
      });
    }

    // Fallback: in-memory only
    if (users.find(u => u.registrationNumber === registrationNumber)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const user = {
      id: userIdCounter++,
      registrationNumber,
      password,
      role,
      year,
      semester,
      course,
      subject,
      connectedStaff: role === 'student' ? [] : undefined
    };
    users.push(user);
    persist();
    console.log('User registered successfully (memory):', user.registrationNumber);
    return res.status(201).json({
      message: 'Registration successful',
      user: { ...user, password: undefined },
      token: createSignedToken(user.id)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { registrationNumber, password } = req.body || {};
    if (!registrationNumber || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    // Try Mongo first
    if (mongoReady && UserModel) {
      const doc = await UserModel.findOne({ registrationNumber });
      if (doc) {
        let ok = false;
        if (bcrypt) ok = await bcrypt.compare(password, doc.password);
        else ok = password && doc.password && typeof doc.password === 'string' ? (doc.password === password) : false;
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const mirrored = mirrorMongoUserIntoMemory(doc.toObject());
        const token = createJwtToken(mirrored) || createSignedToken(mirrored.id);
        console.log('User logged in successfully (Mongo):', mirrored.registrationNumber);
        return res.json({
          message: 'Login successful',
          user: { ...mirrored, password: undefined },
          token
        });
      }
    }

    // Fallback: in-memory
    const user = users.find(u => u.registrationNumber === registrationNumber && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('User logged in successfully (memory):', user.registrationNumber);
    return res.json({
      message: 'Login successful',
      user: { ...user, password: undefined },
      token: createSignedToken(user.id)
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
  // Prefer auth token; fallback to body.studentId for older clients
  const authedUser = getUserFromToken(req.headers.authorization);
  const { studentId, staffId } = req.body || {}; // staffId is staff registrationNumber

  let student = null;
  if (authedUser && authedUser.role === 'student') {
    student = authedUser;
  } else if (studentId) {
    student = users.find(u => u.id === studentId && u.role === 'student') || null;
  }

  const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff') || null;

  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (!staff) return res.status(404).json({ message: 'Staff not found' });

  if (!student.connectedStaff) student.connectedStaff = [];
  if (!student.connectedStaff.includes(staff.registrationNumber)) {
    student.connectedStaff.push(staff.registrationNumber);
    persist();
  }
  console.log(`Student ${student.registrationNumber} connected to staff ${staff.registrationNumber}`);
  res.json({
    message: 'Connected to staff successfully',
    staffId: staff.registrationNumber,
    staffName: staff.registrationNumber,
    staffSubject: staff.subject || 'General',
  });
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
  persist();
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
  persist();
    return res.json({ message: 'Staff removed' });
  } catch (err) {
    console.error('Remove staff error:', err);
    return res.status(500).json({ message: 'Failed to remove staff' });
  }
});


// Notes routes
app.get('/api/notes', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`Fetching notes for user: ${user.registrationNumber}`);

    if (mongoReady && NoteModel) {
      if (user.role === 'staff') {
        const list = await NoteModel.find({ createdByName: user.registrationNumber })
          .sort({ createdAt: -1 }).lean();
        return res.json(list.map(n => ({ ...n, _id: String(n._id) })));
      } else {
        const own = await NoteModel.find({ createdByName: user.registrationNumber })
          .sort({ createdAt: -1 }).lean();
        const connected = Array.isArray(user.connectedStaff) ? user.connectedStaff : [];
        let shared = [];
        if (connected.length) {
          shared = await NoteModel.find({ shared: true, createdByRole: 'staff', createdByName: { $in: connected } })
            .sort({ createdAt: -1 }).lean();
        }
        return res.json([...own, ...shared].map(n => ({ ...n, _id: String(n._id) })));
      }
    }

    // Fallback to in-memory
    let userNotes = [];
    if (user.role === 'staff') {
      userNotes = notes.filter(note => note.createdById === user.id);
    } else {
      const ownNotes = notes.filter(note => note.createdById === user.id);
      const connectedStaffRegNumbers = user.connectedStaff || [];
      const sharedNotes = notes.filter(note => note.shared && note.createdByRole === 'staff' && connectedStaffRegNumbers.includes(note.createdByName));
      userNotes = [...ownNotes, ...sharedNotes];
    }
    console.log(`Found ${userNotes.length} notes for user ${user.registrationNumber}`);
    return res.json(userNotes);
  } catch (error) {
    console.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
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
    if (mongoReady && NoteModel) {
      const doc = await NoteModel.create({
        title,
        content,
        tags: Array.isArray(tags) ? tags : [],
        shared: user.role === 'staff' ? !!shared : false,
        createdByName: user.registrationNumber,
        createdByRole: user.role,
        createdBySubject: user.role === 'staff' ? (user.subject || 'General') : undefined
      });
      const data = doc.toObject();
      console.log('Note created successfully (Mongo):', { id: String(data._id) });
      return res.status(201).json({ ...data, _id: String(data._id) });
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
    persist();
    console.log('Note created successfully (memory):', note);
    return res.status(201).json(note);
  } catch (error) {
    console.error('Note creation error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Search shared notes by staff registrationNumber (for students)
app.get('/api/notes/search/:staffId', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    if (mongoReady && NoteModel) {
      const sharedNotes = await NoteModel.find({ createdByRole: 'staff', shared: true, createdByName: staff.registrationNumber })
        .sort({ createdAt: -1 }).lean();
      const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', notesCount: sharedNotes.length };
      return res.json({ notes: sharedNotes.map(n => ({ ...n, _id: String(n._id) })), teacherInfo });
    }

    const sharedNotes = notes.filter(n => n.createdByRole === 'staff' && n.shared && n.createdByName === staff.registrationNumber);

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
app.post('/api/notes/save/:noteId', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && NoteModel) {
      const srcId = req.params.noteId;
      const source = await NoteModel.findOne({ _id: srcId }).lean();
      if (!source) return res.status(404).json({ message: 'Note not found' });
      if (!(source.shared && source.createdByRole === 'staff')) {
        return res.status(400).json({ message: 'Note is not a shared staff note' });
      }
      const copyDoc = await NoteModel.create({
        title: source.title,
        content: source.content,
        tags: Array.isArray(source.tags) ? [...source.tags] : [],
        shared: false,
        createdByName: user.registrationNumber,
        createdByRole: user.role,
        originStaffId: source.createdByName,
        originStaffSubject: source.createdBySubject || 'General',
        originNoteId: String(source._id)
      });
      const data = copyDoc.toObject();
      return res.status(201).json({ ...data, _id: String(data._id) });
    }

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
      originStaffId: source.createdByName,
      originStaffSubject: source.createdBySubject || 'General',
      originNoteId: source._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.unshift(copy);
    persist();
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save searched note error:', err);
    return res.status(500).json({ message: 'Failed to save note' });
  }
});

// Files (PDF/PPT) routes
app.get('/api/files', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (mongoReady && FileModel) {
      if (user.role === 'staff') {
        const list = await FileModel.find({ ownerName: user.registrationNumber }).sort({ createdAt: -1 }).lean();
        return res.json(list.map(d => ({ ...d, id: String(d._id) })));
      } else {
        const own = await FileModel.find({ ownerName: user.registrationNumber }).sort({ createdAt: -1 }).lean();
        const connected = user.connectedStaff || [];
        let shared = [];
        if (connected.length) {
          shared = await FileModel.find({ isShared: true, ownerRole: 'staff', ownerName: { $in: connected } }).sort({ createdAt: -1 }).lean();
        }
        return res.json([...own, ...shared].map(d => ({ ...d, id: String(d._id) })));
      }
    }

    // Fallback
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
      .finally(async () => {
        if (mongoReady && FileModel) {
          const doc = await FileModel.create({
            title,
            filename,
            fileData: publicUrl ? undefined : fileData,
            fileUrl: publicUrl || fileData,
            ownerName: user.registrationNumber,
            ownerRole: user.role,
            ownerSubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
            isShared: user.role === 'staff' ? !!isShared : false,
            annotations: []
          });
          const data = doc.toObject();
          console.log('File uploaded (Mongo):', { id: String(data._id), filename: data.filename, by: user.registrationNumber, to: publicUrl ? 'S3' : 'local' });
          return res.status(201).json({ ...data, id: String(data._id) });
        }
        const file = {
          id: String(fileIdCounter++),
          title,
          filename,
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
        persist();
        console.log('File uploaded (memory):', { id: file.id, filename: file.filename, by: user.registrationNumber, to: publicUrl ? 'S3' : 'local' });
        return res.status(201).json(file);
      });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
});

app.put('/api/files/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && FileModel) {
      const id = String(req.params.id);
      const doc = await FileModel.findById(id);
      if (!doc) return res.status(404).json({ message: 'File not found' });
      if (doc.ownerName !== user.registrationNumber) return res.status(403).json({ message: 'Forbidden: not owner' });
      const { annotations, isShared } = req.body || {};
      if (Array.isArray(annotations)) doc.annotations = annotations;
      if (doc.ownerRole === 'staff' && isShared !== undefined) doc.isShared = !!isShared;
      if (doc.ownerRole !== 'staff') doc.isShared = false;
      await doc.save();
      const data = doc.toObject();
      console.log('File updated (Mongo):', { id });
      return res.json({ ...data, id: String(data._id) });
    }

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
    console.log('File updated (memory):', { id });
    persist();
    return res.json(files[idx]);
  } catch (err) {
    console.error('File update error:', err);
    return res.status(500).json({ message: 'Failed to update file' });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && FileModel) {
      const id = String(req.params.id);
      const doc = await FileModel.findById(id);
      if (!doc) return res.status(404).json({ message: 'File not found' });
      if (doc.ownerName !== user.registrationNumber) return res.status(403).json({ message: 'Forbidden: not owner' });
      await FileModel.deleteOne({ _id: id });
      console.log('File deleted (Mongo):', { id });
      return res.json({ message: 'File deleted' });
    }
    const id = String(req.params.id);
    const idx = files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ message: 'File not found' });
    const file = files[idx];
    if (file.ownerId !== user.id) return res.status(403).json({ message: 'Forbidden: not owner' });
    files.splice(idx, 1);
    persist();
    console.log('File deleted (memory):', { id });
    return res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('File delete error:', err);
    return res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Search shared files by staff registrationNumber (for students)
app.get('/api/files/search/:staffId', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (mongoReady && FileModel) {
      const shared = await FileModel.find({ isShared: true, ownerRole: 'staff', ownerName: staff.registrationNumber }).sort({ createdAt: -1 }).lean();
      const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', filesCount: shared.length };
      return res.json({ files: shared.map(d => ({ ...d, id: String(d._id) })), teacherInfo });
    }
    const shared = files.filter(f => f.isShared && f.ownerRole === 'staff' && f.ownerName === staff.registrationNumber);
    const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', filesCount: shared.length };
    return res.json({ files: shared, teacherInfo });
  } catch (err) {
    console.error('Files search error:', err);
    return res.status(500).json({ message: 'Failed to search files' });
  }
});

// Save a shared staff file into the student's own files
app.post('/api/files/save/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && FileModel) {
      const id = String(req.params.id);
      const src = await FileModel.findById(id).lean();
      if (!src) return res.status(404).json({ message: 'File not found' });
      if (!(src.isShared && src.ownerRole === 'staff')) return res.status(400).json({ message: 'File is not a shared staff file' });
      const copyDoc = await FileModel.create({
        title: src.title,
        filename: src.filename,
        fileUrl: src.fileUrl,
        fileData: src.fileData,
        ownerName: user.registrationNumber,
        ownerRole: user.role,
        isShared: false,
        annotations: Array.isArray(src.annotations) ? [...src.annotations] : []
      });
      const data = copyDoc.toObject();
      return res.status(201).json({ ...data, id: String(data._id) });
    }
    const id = String(req.params.id);
    const source = files.find(f => f.id === id);
    if (!source) return res.status(404).json({ message: 'File not found' });
    if (!(source.isShared && source.ownerRole === 'staff')) return res.status(400).json({ message: 'File is not a shared staff file' });
    const copy = { ...source, id: String(fileIdCounter++), ownerId: user.id, ownerName: user.registrationNumber, ownerRole: user.role, ownerSubject: undefined, isShared: false, annotations: Array.isArray(source.annotations) ? [...source.annotations] : [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    files.unshift(copy);
    persist();
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save shared file error:', err);
    return res.status(500).json({ message: 'Failed to save file' });
  }
});

// Whiteboard routes
app.get('/api/whiteboards', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && WhiteboardModel) {
      if (user.role === 'staff') {
        const list = await WhiteboardModel.find({ ownerName: user.registrationNumber }).sort({ createdAt: -1 }).lean();
        return res.json(list.map(d => ({ ...d, id: String(d._id) })));
      } else {
        const own = await WhiteboardModel.find({ ownerName: user.registrationNumber }).sort({ createdAt: -1 }).lean();
        const connected = user.connectedStaff || [];
        let shared = [];
        if (connected.length) {
          shared = await WhiteboardModel.find({ isShared: true, ownerRole: 'staff', ownerName: { $in: connected } }).sort({ createdAt: -1 }).lean();
        }
        return res.json([...own, ...shared].map(d => ({ ...d, id: String(d._id) })));
      }
    }
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

app.post('/api/whiteboards', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { title, imageData, isShared } = req.body || {};
    if (!title || !imageData) return res.status(400).json({ message: 'title and imageData are required' });
    if (mongoReady && WhiteboardModel) {
      const doc = await WhiteboardModel.create({
        title,
        imageData,
        ownerName: user.registrationNumber,
        ownerRole: user.role,
        ownerSubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
        isShared: user.role === 'staff' ? !!isShared : false
      });
      const data = doc.toObject();
      console.log('Whiteboard saved (Mongo):', { id: String(data._id), by: user.registrationNumber });
      return res.status(201).json({ ...data, id: String(data._id) });
    }
    const wb = {
      id: String(whiteboardIdCounter++),
      title,
      imageData,
      ownerId: user.id,
      ownerName: user.registrationNumber,
      ownerRole: user.role,
      ownerSubject: user.role === 'staff' ? (user.subject || 'General') : undefined,
      isShared: user.role === 'staff' ? !!isShared : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    whiteboards.unshift(wb);
    persist();
    console.log('Whiteboard saved (memory):', { id: wb.id, by: user.registrationNumber });
    return res.status(201).json(wb);
  } catch (err) {
    console.error('Whiteboard save error:', err);
    return res.status(500).json({ message: 'Failed to save whiteboard' });
  }
});

app.delete('/api/whiteboards/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && WhiteboardModel) {
      const id = String(req.params.id);
      const doc = await WhiteboardModel.findById(id);
      if (!doc) return res.status(404).json({ message: 'Whiteboard not found' });
      if (doc.ownerName !== user.registrationNumber) return res.status(403).json({ message: 'Forbidden: not owner' });
      await WhiteboardModel.deleteOne({ _id: id });
      console.log('Whiteboard deleted (Mongo):', { id });
      return res.json({ message: 'Whiteboard deleted' });
    }
    const id = String(req.params.id);
    const idx = whiteboards.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ message: 'Whiteboard not found' });
    const wb = whiteboards[idx];
    if (wb.ownerId !== user.id) return res.status(403).json({ message: 'Forbidden: not owner' });
    whiteboards.splice(idx, 1);
    persist();
    console.log('Whiteboard deleted (memory):', { id });
    return res.json({ message: 'Whiteboard deleted' });
  } catch (err) {
    console.error('Whiteboard delete error:', err);
    return res.status(500).json({ message: 'Failed to delete whiteboard' });
  }
});

// Search shared whiteboards by staff registrationNumber (for students)
app.get('/api/whiteboards/search/:staffId', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = req.params.staffId;
    const staff = users.find(u => u.registrationNumber === staffId && u.role === 'staff');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (mongoReady && WhiteboardModel) {
      const shared = await WhiteboardModel.find({ isShared: true, ownerRole: 'staff', ownerName: staff.registrationNumber }).sort({ createdAt: -1 }).lean();
      const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', drawingsCount: shared.length };
      return res.json({ drawings: shared.map(d => ({ ...d, id: String(d._id) })), teacherInfo });
    }
    const shared = whiteboards.filter(w => w.isShared && w.ownerRole === 'staff' && w.ownerName === staff.registrationNumber);
    const teacherInfo = { registrationNumber: staff.registrationNumber, subject: staff.subject || 'General', drawingsCount: shared.length };
    return res.json({ drawings: shared, teacherInfo });
  } catch (err) {
    console.error('Whiteboards search error:', err);
    return res.status(500).json({ message: 'Failed to search whiteboards' });
  }
});

// Save a shared staff whiteboard into the student's own drawings
app.post('/api/whiteboards/save/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (mongoReady && WhiteboardModel) {
      const id = String(req.params.id);
      const src = await WhiteboardModel.findById(id).lean();
      if (!src) return res.status(404).json({ message: 'Whiteboard not found' });
      if (!(src.isShared && src.ownerRole === 'staff')) return res.status(400).json({ message: 'Whiteboard is not a shared staff drawing' });
      const copyDoc = await WhiteboardModel.create({
        title: src.title,
        imageData: src.imageData,
        ownerName: user.registrationNumber,
        ownerRole: user.role,
        isShared: false
      });
      const data = copyDoc.toObject();
      return res.status(201).json({ ...data, id: String(data._id) });
    }
    const id = String(req.params.id);
    const source = whiteboards.find(w => w.id === id);
    if (!source) return res.status(404).json({ message: 'Whiteboard not found' });
    if (!(source.isShared && source.ownerRole === 'staff')) return res.status(400).json({ message: 'Whiteboard is not a shared staff drawing' });
    const copy = { ...source, id: String(whiteboardIdCounter++), ownerId: user.id, ownerName: user.registrationNumber, ownerRole: user.role, ownerSubject: undefined, isShared: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    whiteboards.unshift(copy);
    persist();
    return res.status(201).json(copy);
  } catch (err) {
    console.error('Save shared whiteboard error:', err);
    return res.status(500).json({ message: 'Failed to save whiteboard' });
  }
});

// Update an existing note (owner only)
app.put('/api/notes/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (mongoReady && NoteModel) {
      const id = req.params.id;
      const doc = await NoteModel.findById(id);
      if (!doc) return res.status(404).json({ error: 'Note not found' });
      if (doc.createdByName !== user.registrationNumber) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
      }
      const { title, content, tags, shared } = req.body || {};
      if (typeof title === 'string' && title.length) doc.title = title;
      if (typeof content === 'string' && content.length) doc.content = content;
      if (Array.isArray(tags)) doc.tags = tags;
      if (doc.createdByRole === 'staff') {
        if (shared !== undefined) doc.shared = !!shared;
      } else {
        doc.shared = false;
      }
      await doc.save();
      const data = doc.toObject();
      console.log('Note updated successfully (Mongo):', { id: String(data._id) });
      return res.json({ ...data, _id: String(data._id) });
    }

    const noteId = parseInt(req.params.id, 10);
    if (Number.isNaN(noteId)) return res.status(400).json({ error: 'Invalid note id' });
    const idx = notes.findIndex(n => n._id === noteId);
    if (idx === -1) return res.status(404).json({ error: 'Note not found' });
    const note = notes[idx];
    if (note.createdById !== user.id) return res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
    const { title, content, tags, shared } = req.body || {};
    const updated = {
      ...note,
      title: typeof title === 'string' && title.length ? title : note.title,
      content: typeof content === 'string' && content.length ? content : note.content,
      tags: Array.isArray(tags) ? tags : note.tags,
      shared: note.createdByRole === 'staff' ? (shared !== undefined ? !!shared : note.shared) : false,
      updatedAt: new Date().toISOString()
    };
    notes[idx] = updated;
    persist();
    console.log('Note updated successfully (memory):', updated);
    return res.json(updated);
  } catch (error) {
    console.error('Note update error:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note (owner only)
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (mongoReady && NoteModel) {
      const id = req.params.id;
      const doc = await NoteModel.findById(id);
      if (!doc) return res.status(404).json({ error: 'Note not found' });
      if (doc.createdByName !== user.registrationNumber) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
      }
      await NoteModel.deleteOne({ _id: id });
      console.log('Note deleted successfully (Mongo):', { id });
      return res.status(200).json({ message: 'Note deleted successfully' });
    }

    const noteId = parseInt(req.params.id, 10);
    if (Number.isNaN(noteId)) return res.status(400).json({ error: 'Invalid note id' });
    const idx = notes.findIndex(n => n._id === noteId);
    if (idx === -1) return res.status(404).json({ error: 'Note not found' });
    const note = notes[idx];
    if (note.createdById !== user.id) return res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
    notes.splice(idx, 1);
    persist();
    console.log('Note deleted successfully (memory):', { _id: noteId });
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
