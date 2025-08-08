import express from 'express';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// In-memory storage for whiteboards (replace with database in production)
let whiteboards: any[] = [];
let nextId = 1;

// Get all whiteboards for the authenticated user
router.get('/', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let query: any;

    if (user.role === 'staff') {
      // Staff sees only their own whiteboards
      query = { authorId: req.user.id };
    } else {
      // Students see their own whiteboards + shared whiteboards from connected teachers
      const userTeacherCodes = user.teacherCodes || [];
      
      query = {
        $or: [
          { authorId: req.user.id }, // User's own whiteboards
          { 
            isShared: true,
            teacherCode: { $in: userTeacherCodes }
          }
        ]
      };
    }

    const userWhiteboards = whiteboards.filter(wb => {
      if (user.role === 'staff') {
        return wb.authorId === req.user.id;
      } else {
        // Student: their own whiteboards + shared from connected teachers
        const userTeacherCodes = user.teacherCodes || [];
        return wb.authorId === req.user.id || 
               (wb.isShared && userTeacherCodes.includes(wb.teacherCode));
      }
    });

    res.json(userWhiteboards);
  } catch (error) {
    console.error('Error fetching whiteboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new whiteboard
router.post('/', auth, async (req: any, res: any) => {
  try {
    const { title, imageData, isShared } = req.body;

    if (!title || !imageData) {
      return res.status(400).json({ message: 'Title and image data are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newWhiteboard = {
      id: (nextId++).toString(),
      title,
      imageData,
      authorId: req.user.id,
      authorName: user.registrationNumber,
      isShared: user.role === 'staff' ? (isShared || false) : false,
      teacherCode: user.role === 'staff' && isShared ? user.teacherCode : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    whiteboards.push(newWhiteboard);
    res.status(201).json(newWhiteboard);
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a whiteboard
router.put('/:id', auth, (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, imageData } = req.body;

    const whiteboardIndex = whiteboards.findIndex(
      wb => wb.id === id && wb.authorId === req.user.id
    );

    if (whiteboardIndex === -1) {
      return res.status(404).json({ message: 'Whiteboard not found' });
    }

    whiteboards[whiteboardIndex] = {
      ...whiteboards[whiteboardIndex],
      title: title || whiteboards[whiteboardIndex].title,
      imageData: imageData || whiteboards[whiteboardIndex].imageData,
      updatedAt: new Date().toISOString()
    };

    res.json(whiteboards[whiteboardIndex]);
  } catch (error) {
    console.error('Error updating whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a whiteboard
router.delete('/:id', auth, (req: any, res: any) => {
  try {
    const { id } = req.params;

    const whiteboardIndex = whiteboards.findIndex(
      wb => wb.id === id && wb.authorId === req.user.id
    );

    if (whiteboardIndex === -1) {
      return res.status(404).json({ message: 'Whiteboard not found' });
    }

    whiteboards.splice(whiteboardIndex, 1);
    res.json({ message: 'Whiteboard deleted successfully' });
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get whiteboard by teacher code (for students to access teacher's whiteboards)
router.get('/teacher/:teacherCode', auth, (req: any, res: any) => {
  try {
    const { teacherCode } = req.params;
    
    // Find teacher's whiteboards by teacher code
    const teacherWhiteboards = whiteboards.filter(wb => {
      // This would need to be modified to lookup teacher by teacherCode
      // For now, returning empty array as this needs user lookup
      return false;
    });

    res.json(teacherWhiteboards);
  } catch (error) {
    console.error('Error fetching teacher whiteboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
