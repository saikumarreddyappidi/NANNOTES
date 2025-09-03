const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const userSchema = new mongoose.Schema({
  registrationNumber: { type: String, unique: true },
  password: String,
  role: String,
  year: String,
  semester: String,
  course: String,
  subject: String,
  connectedStaff: [String],
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
const User = mongoose.model('User', userSchema);

const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  tags: [String],
  shared: Boolean,
  createdByName: String,
  createdByRole: String,
  createdBySubject: String,
}, { timestamps: true });
const Note = mongoose.model('Note', noteSchema);

const fileSchema = new mongoose.Schema({
  title: String,
  fileUrl: String,
  filename: String,
  isShared: Boolean,
  ownerName: String,
  ownerRole: String,
}, { timestamps: true });
const File = mongoose.model('File', fileSchema);

const whiteboardSchema = new mongoose.Schema({
  title: String,
  imageData: String,
  isShared: Boolean,
  ownerName: String,
  ownerRole: String,
}, { timestamps: true });
const Whiteboard = mongoose.model('Whiteboard', whiteboardSchema);

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/auth/register', async (req, res) => {
    const { registrationNumber, password, role, year, semester, course, subject } = req.body || {};
    if (!registrationNumber || !password || !role) return res.status(400).json({ error: 'Missing required fields' });
    const existing = await User.findOne({ registrationNumber });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create({ registrationNumber, password, role, year, semester, course, subject, connectedStaff: role==='student'?[]:undefined });
    const token = jwt.sign({ userId: String(user._id), registrationNumber: user.registrationNumber, role: user.role }, JWT_SECRET);
    res.status(201).json({ user: { id: String(user._id), registrationNumber: user.registrationNumber, role: user.role }, token });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { registrationNumber, password } = req.body || {};
    if (!registrationNumber || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await User.findOne({ registrationNumber });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: String(user._id), registrationNumber: user.registrationNumber, role: user.role }, JWT_SECRET);
    res.json({ user: { id: String(user._id), registrationNumber: user.registrationNumber, role: user.role }, token });
  });

  const auth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };

  app.post('/api/notes', auth, async (req, res) => {
    const { title, content, shared } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const note = await Note.create({ title, content, shared: req.user.role==='staff'?!!shared:false, createdByName: req.user.registrationNumber, createdByRole: req.user.role });
    res.status(201).json({ ...note.toObject(), _id: String(note._id) });
  });

  app.get('/api/notes', auth, async (req, res) => {
    const list = await Note.find({ createdByName: req.user.registrationNumber }).sort({ createdAt: -1 }).lean();
    res.json(list.map(n => ({ ...n, _id: String(n._id) })));
  });

  // Notes search by staff id (shared only)
  app.get('/api/notes/search/:staffId', auth, async (req, res) => {
    const staffId = req.params.staffId;
    const shared = await Note.find({ createdByRole: 'staff', createdByName: staffId, shared: true }).sort({ createdAt: -1 }).lean();
    res.json({ notes: shared.map(n => ({ ...n, _id: String(n._id) })) });
  });

  // Notes save copy (student saves shared staff note)
  app.post('/api/notes/save/:id', auth, async (req, res) => {
    const src = await Note.findById(req.params.id);
    if (!src) return res.status(404).json({ message: 'Not found' });
    if (!(src.shared && src.createdByRole === 'staff')) return res.status(400).json({ message: 'Not shared staff note' });
    const copy = await Note.create({
      title: src.title,
      content: src.content,
      tags: src.tags,
      shared: false,
      createdByName: req.user.registrationNumber,
      createdByRole: req.user.role,
    });
    res.status(201).json({ ...copy.toObject(), _id: String(copy._id) });
  });

  // Notes update (owner only); students cannot set shared
  app.put('/api/notes/:id', auth, async (req, res) => {
    const doc = await Note.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.createdByName !== req.user.registrationNumber) return res.status(403).json({ message: 'Forbidden' });
    const { title, content, tags, shared } = req.body || {};
    if (typeof title === 'string') doc.title = title;
    if (typeof content === 'string') doc.content = content;
    if (Array.isArray(tags)) doc.tags = tags;
    if (doc.createdByRole === 'staff') {
      if (shared !== undefined) doc.shared = !!shared;
    } else {
      doc.shared = false;
    }
    await doc.save();
    res.json({ ...doc.toObject(), _id: String(doc._id) });
  });

  // Notes delete (owner only)
  app.delete('/api/notes/:id', auth, async (req, res) => {
    const doc = await Note.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.createdByName !== req.user.registrationNumber) return res.status(403).json({ message: 'Forbidden' });
    await Note.deleteOne({ _id: doc._id });
    res.json({ success: true });
  });

  // Files endpoints (simplified)
  app.post('/api/files', auth, async (req, res) => {
    const { title, fileUrl, filename, isShared } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const f = await File.create({
      title,
      fileUrl: fileUrl || '',
      filename: filename || '',
      isShared: req.user.role === 'staff' ? !!isShared : false,
      ownerName: req.user.registrationNumber,
      ownerRole: req.user.role,
    });
    res.status(201).json({ ...f.toObject(), _id: String(f._id) });
  });

  app.get('/api/files', auth, async (req, res) => {
    const list = await File.find({ ownerName: req.user.registrationNumber }).sort({ createdAt: -1 }).lean();
    res.json(list.map(x => ({ ...x, _id: String(x._id) })));
  });

  app.delete('/api/files/:id', auth, async (req, res) => {
    const doc = await File.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.ownerName !== req.user.registrationNumber) return res.status(403).json({ message: 'Forbidden' });
    await File.deleteOne({ _id: doc._id });
    res.json({ success: true });
  });

  // Files search by staff id (shared only)
  app.get('/api/files/search/:staffId', auth, async (req, res) => {
    const staffId = req.params.staffId;
    const shared = await File.find({ ownerRole: 'staff', ownerName: staffId, isShared: true }).sort({ createdAt: -1 }).lean();
    res.json({ files: shared.map(x => ({ ...x, _id: String(x._id) })) });
  });

  // Files save copy (student saves shared staff file)
  app.post('/api/files/save/:id', auth, async (req, res) => {
    const src = await File.findById(req.params.id);
    if (!src) return res.status(404).json({ message: 'Not found' });
    if (!(src.isShared && src.ownerRole === 'staff')) return res.status(400).json({ message: 'Not shared staff file' });
    const copy = await File.create({
      title: src.title,
      fileUrl: src.fileUrl,
      filename: src.filename,
      isShared: false,
      ownerName: req.user.registrationNumber,
      ownerRole: req.user.role,
    });
    res.status(201).json({ ...copy.toObject(), _id: String(copy._id) });
  });

  // Whiteboards endpoints (simplified)
  app.post('/api/whiteboards', auth, async (req, res) => {
    const { title, imageData, isShared } = req.body || {};
    if (!title || !imageData) return res.status(400).json({ error: 'Title and imageData are required' });
    const w = await Whiteboard.create({
      title,
      imageData,
      isShared: req.user.role === 'staff' ? !!isShared : false,
      ownerName: req.user.registrationNumber,
      ownerRole: req.user.role,
    });
    res.status(201).json({ ...w.toObject(), _id: String(w._id) });
  });

  app.get('/api/whiteboards', auth, async (req, res) => {
    const list = await Whiteboard.find({ ownerName: req.user.registrationNumber }).sort({ createdAt: -1 }).lean();
    res.json(list.map(x => ({ ...x, _id: String(x._id) })));
  });

  app.delete('/api/whiteboards/:id', auth, async (req, res) => {
    const doc = await Whiteboard.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.ownerName !== req.user.registrationNumber) return res.status(403).json({ message: 'Forbidden' });
    await Whiteboard.deleteOne({ _id: doc._id });
    res.json({ success: true });
  });

  // Whiteboards search by staff id (shared only)
  app.get('/api/whiteboards/search/:staffId', auth, async (req, res) => {
    const staffId = req.params.staffId;
    const shared = await Whiteboard.find({ ownerRole: 'staff', ownerName: staffId, isShared: true }).sort({ createdAt: -1 }).lean();
    res.json({ drawings: shared.map(x => ({ ...x, _id: String(x._id) })) });
  });

  // Whiteboards save copy
  app.post('/api/whiteboards/save/:id', auth, async (req, res) => {
    const src = await Whiteboard.findById(req.params.id);
    if (!src) return res.status(404).json({ message: 'Not found' });
    if (!(src.isShared && src.ownerRole === 'staff')) return res.status(400).json({ message: 'Not shared staff whiteboard' });
    const copy = await Whiteboard.create({
      title: src.title,
      imageData: src.imageData,
      isShared: false,
      ownerName: req.user.registrationNumber,
      ownerRole: req.user.role,
    });
    res.status(201).json({ ...copy.toObject(), _id: String(copy._id) });
  });

  return app;
}

module.exports = { createApp, User, Note, File, Whiteboard };
