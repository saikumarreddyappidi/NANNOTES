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

  return app;
}

module.exports = { createApp, User, Note };
