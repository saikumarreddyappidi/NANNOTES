import express from 'express';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Add teacher code for student (to access shared notes)
router.post('/add-teacher', auth, async (req: any, res: any) => {
  try {
    const { teacherCode } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can add teacher codes' });
    }
    
    // Verify teacher code exists
    const teacher = await User.findOne({ teacherCode, role: 'staff' });
    if (!teacher) {
      return res.status(404).json({ message: 'Invalid teacher code' });
    }
    
    // Initialize teacherCodes array if it doesn't exist
    if (!user.teacherCodes) {
      user.teacherCodes = [];
    }
    
    // Check if teacher code is already added
    if (user.teacherCodes.includes(teacherCode)) {
      return res.status(400).json({ message: 'Teacher code already added' });
    }
    
    // Add teacher code
    user.teacherCodes.push(teacherCode);
    await user.save();
    
    res.json({ 
      message: 'Teacher code added successfully',
      teacherName: teacher.registrationNumber,
      teacherSubject: teacher.subject 
    });
  } catch (error) {
    console.error('Error adding teacher code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove teacher code for student
router.delete('/remove-teacher/:teacherCode', auth, async (req: any, res: any) => {
  try {
    const { teacherCode } = req.params;
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can remove teacher codes' });
    }
    
    if (user.teacherCodes) {
      user.teacherCodes = user.teacherCodes.filter(code => code !== teacherCode);
      await user.save();
    }
    
    res.json({ message: 'Teacher code removed successfully' });
  } catch (error) {
    console.error('Error removing teacher code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's connected teachers
router.get('/connected', auth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view connected teachers' });
    }
    
    const teacherCodes = user.teacherCodes || [];
    const teachers = await User.find({ 
      teacherCode: { $in: teacherCodes },
      role: 'staff'
    }).select('registrationNumber teacherCode subject');
    
    // Format the response to match frontend expectations
    const formattedTeachers = teachers.map(teacher => ({
      _id: teacher._id,
      firstName: teacher.registrationNumber,
      lastName: '',
      teacherCode: teacher.teacherCode,
      subject: teacher.subject
    }));
    
    res.json(formattedTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search for teachers by teacher code
router.get('/search/:teacherCode', auth, async (req: any, res: any) => {
  try {
    const { teacherCode } = req.params;
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can search for teachers' });
    }
    
    const teacher = await User.findOne({ 
      teacherCode, 
      role: 'staff' 
    }).select('registrationNumber teacherCode subject');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found with this code' });
    }
    
    // Check if already connected
    const isConnected = user.teacherCodes && user.teacherCodes.includes(teacherCode);
    
    res.json({
      _id: teacher._id,
      firstName: teacher.registrationNumber, // Using registrationNumber as name
      lastName: '', // Empty as we don't have separate fields
      teacherCode: teacher.teacherCode,
      subject: teacher.subject,
      isConnected
    });
  } catch (error) {
    console.error('Error searching teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
