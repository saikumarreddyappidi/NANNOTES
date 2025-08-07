import express from 'express';
import { body, validationResult } from 'express-validator';
import Note from '../models/Note';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Get all notes (user's notes + shared notes from teachers)
router.get('/', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query: any = {
      $or: [
        { authorId: req.user.userId }, // User's own notes
      ]
    };

    // If user has a teacher code, include shared notes from that teacher
    if (user.teacherCode) {
      query.$or.push({ teacherCode: user.teacherCode, isShared: true });
    }

    const notes = await Note.find(query).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error: any) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search notes
router.get('/search', auth, async (req: any, res: any) => {
  try {
    const { q, tags } = req.query;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query: any = {
      $or: [
        { authorId: req.user.userId },
      ]
    };

    // Include shared notes if user has teacher code
    if (user.teacherCode) {
      query.$or.push({ teacherCode: user.teacherCode, isShared: true });
    }

    // Add search criteria
    if (q) {
      query.$text = { $search: q };
    }

    if (tags && tags.length > 0) {
      const tagArray = tags.split(',').map((tag: string) => tag.trim());
      query.tags = { $in: tagArray };
    }

    const notes = await Note.find(query).sort({ score: { $meta: 'textScore' } });
    res.json(notes);
  } catch (error: any) {
    console.error('Search notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create note
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, isShared } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const noteData: any = {
      title,
      content,
      tags: tags || [],
      authorId: req.user.userId,
      authorName: user.registrationNumber,
      isShared: false
    };

    // Only staff can share notes
    if (user.role === 'staff' && isShared) {
      noteData.isShared = true;
      noteData.teacherCode = user.teacherCode;
    }

    const note = new Note(noteData);
    await note.save();

    res.status(201).json(note);
  } catch (error: any) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update note
router.put('/:id', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, isShared } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if user owns the note
    if (note.authorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update note
    note.title = title;
    note.content = content;
    note.tags = tags || [];

    // Only staff can share notes
    if (user.role === 'staff') {
      note.isShared = isShared || false;
      if (note.isShared) {
        note.teacherCode = user.teacherCode;
      } else {
        note.teacherCode = undefined;
      }
    }

    await note.save();
    res.json(note);
  } catch (error: any) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note
router.delete('/:id', auth, async (req: any, res: any) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if user owns the note
    if (note.authorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
