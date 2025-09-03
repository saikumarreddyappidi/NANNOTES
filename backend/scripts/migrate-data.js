/*
  Migration: Move data from backend/data.json (used by simple-test-server) into MongoDB.
  - Users, Notes, Files, Whiteboards
  - Idempotent: skips duplicates by registrationNumber or natural keys
*/
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function main() {
  const DATA_PATH = path.join(__dirname, '..', 'data.json');
  if (!fs.existsSync(DATA_PATH)) {
    console.log('No data.json found, nothing to migrate.');
    process.exit(0);
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const json = JSON.parse(raw || '{}');

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nannotes-dev';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Define minimal schemas matching simple-test-server Mongo models
  const User = mongoose.model('User', new mongoose.Schema({
    registrationNumber: { type: String, unique: true },
    password: String,
    role: String,
    year: String,
    semester: String,
    course: String,
    subject: String,
    connectedStaff: [String],
    createdAt: { type: Date, default: Date.now }
  }));

  const Note = mongoose.model('Note', new mongoose.Schema({
    title: String,
    content: String,
    tags: [String],
    shared: Boolean,
    createdByName: String,
    createdByRole: String,
    createdBySubject: String,
    originStaffId: String,
    originStaffSubject: String,
    originNoteId: String,
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }));

  const File = mongoose.model('File', new mongoose.Schema({
    title: String,
    filename: String,
    fileUrl: String,
    fileData: String,
    ownerName: String,
    ownerRole: String,
    ownerSubject: String,
    isShared: Boolean,
    annotations: Array,
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }));

  const Whiteboard = mongoose.model('Whiteboard', new mongoose.Schema({
    title: String,
    imageData: String,
    ownerName: String,
    ownerRole: String,
    ownerSubject: String,
    isShared: Boolean,
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }));

  // Users
  const users = Array.isArray(json.users) ? json.users : [];
  let createdUsers = 0, skippedUsers = 0;
  for (const u of users) {
    const exists = await User.findOne({ registrationNumber: u.registrationNumber });
    if (exists) { skippedUsers++; continue; }
    await User.create({
      registrationNumber: u.registrationNumber,
      password: u.password, // already plain-text in data.json; can be re-hashed on next login/register flow
      role: u.role,
      year: u.year,
      semester: u.semester,
      course: u.course,
      subject: u.subject,
      connectedStaff: u.connectedStaff || [],
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
    });
    createdUsers++;
  }
  console.log(`Users: created=${createdUsers}, skipped=${skippedUsers}`);

  // Notes
  const notes = Array.isArray(json.notes) ? json.notes : [];
  let createdNotes = 0;
  for (const n of notes) {
    // Try to prevent duplicates by natural key
    const exists = await Note.findOne({ title: n.title, createdByName: n.createdByName, createdAt: new Date(n.createdAt) });
    if (exists) continue;
    await Note.create({
      title: n.title,
      content: n.content,
      tags: n.tags || [],
      shared: !!n.shared,
      createdByName: n.createdByName,
      createdByRole: n.createdByRole,
      createdBySubject: n.createdBySubject,
      originStaffId: n.originStaffId,
      originStaffSubject: n.originStaffSubject,
      originNoteId: String(n._id || ''),
      createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
      updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
    });
    createdNotes++;
  }
  console.log(`Notes: created=${createdNotes}`);

  // Files
  const files = Array.isArray(json.files) ? json.files : [];
  let createdFiles = 0;
  for (const f of files) {
    const exists = await File.findOne({ filename: f.filename, ownerName: f.ownerName, createdAt: new Date(f.createdAt) });
    if (exists) continue;
    await File.create({
      title: f.title,
      filename: f.filename,
      fileUrl: f.fileUrl,
      fileData: f.fileData,
      ownerName: f.ownerName,
      ownerRole: f.ownerRole,
      ownerSubject: f.ownerSubject,
      isShared: !!f.isShared,
      annotations: Array.isArray(f.annotations) ? f.annotations : [],
      createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
      updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date()
    });
    createdFiles++;
  }
  console.log(`Files: created=${createdFiles}`);

  // Whiteboards
  const whiteboards = Array.isArray(json.whiteboards) ? json.whiteboards : [];
  let createdWbs = 0;
  for (const w of whiteboards) {
    const exists = await Whiteboard.findOne({ title: w.title, ownerName: w.ownerName, createdAt: new Date(w.createdAt) });
    if (exists) continue;
    await Whiteboard.create({
      title: w.title,
      imageData: w.imageData,
      ownerName: w.ownerName,
      ownerRole: w.ownerRole,
      ownerSubject: w.ownerSubject,
      isShared: !!w.isShared,
      createdAt: w.createdAt ? new Date(w.createdAt) : new Date(),
      updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
    });
    createdWbs++;
  }
  console.log(`Whiteboards: created=${createdWbs}`);

  await mongoose.disconnect();
  console.log('Migration finished.');
}

main().catch(err => { console.error('Migration error:', err); process.exit(1); });
