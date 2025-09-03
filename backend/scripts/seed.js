// Simple seed script for quick manual testing with Mongo
// Usage: node scripts/seed.js

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set.');
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });

  const userSchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'staff'], required: true },
    subject: String,
    year: String,
    semester: String,
    course: String,
    connectedStaff: [String],
  });
  const User = mongoose.model('User', userSchema);

  const Note = mongoose.model('Note', new mongoose.Schema({
    title: String,
    content: String,
    tags: [String],
    shared: Boolean,
    createdByName: String,
    createdByRole: String,
    createdBySubject: String,
  }));

  // Upsert staff and student
  await User.updateOne(
    { registrationNumber: 'staff_demo' },
    { $set: { registrationNumber: 'staff_demo', password: 'Passw0rd!', role: 'staff', subject: 'Math' } },
    { upsert: true }
  );
  await User.updateOne(
    { registrationNumber: 'student_demo' },
    { $set: { registrationNumber: 'student_demo', password: 'Passw0rd!', role: 'student', year: '1', semester: '1', course: 'CSE', connectedStaff: ['staff_demo'] } },
    { upsert: true }
  );

  // Seed a shared note by staff
  await Note.create({ title: 'Welcome', content: 'Shared note from staff', tags: ['intro'], shared: true, createdByName: 'staff_demo', createdByRole: 'staff', createdBySubject: 'Math' });

  console.log('Seed complete. Users: staff_demo / student_demo, password: Passw0rd!');
  await mongoose.disconnect();
})();
