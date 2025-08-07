import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Register
router.post('/register', [
  body('registrationNumber').notEmpty().withMessage('Registration number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .withMessage('Password must contain at least one uppercase, lowercase, number and special character'),
  body('role').isIn(['student', 'staff']).withMessage('Role must be student or staff')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registrationNumber, password, role, year, semester, course, teacherCode, subject } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ registrationNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this registration number' });
    }

    // Create user data
    const userData: any = {
      registrationNumber,
      password,
      role,
      year,
      semester
    };

    if (role === 'student') {
      userData.course = course;
      if (teacherCode) {
        // Validate teacher code exists
        const teacher = await User.findOne({ teacherCode, role: 'staff' });
        if (!teacher) {
          return res.status(400).json({ message: 'Invalid teacher code' });
        }
        userData.teacherCode = teacherCode;
      }
    } else if (role === 'staff') {
      userData.subject = subject;
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: (user._id as any).toString(), role: user.role },
      process.env.JWT_SECRET || 'fallback-secret'
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        registrationNumber: user.registrationNumber,
        role: user.role,
        year: user.year,
        semester: user.semester,
        course: user.course,
        subject: user.subject,
        teacherCode: user.teacherCode,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('registrationNumber').notEmpty().withMessage('Registration number is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registrationNumber, password } = req.body;

    // Find user
    const user = await User.findOne({ registrationNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: (user._id as any).toString(), role: user.role },
      process.env.JWT_SECRET || 'fallback-secret'
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        registrationNumber: user.registrationNumber,
        role: user.role,
        year: user.year,
        semester: user.semester,
        course: user.course,
        subject: user.subject,
        teacherCode: user.teacherCode,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        registrationNumber: user.registrationNumber,
        role: user.role,
        year: user.year,
        semester: user.semester,
        course: user.course,
        subject: user.subject,
        teacherCode: user.teacherCode,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
