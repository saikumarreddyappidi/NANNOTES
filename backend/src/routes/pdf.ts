import express from 'express';
import User from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// In-memory storage for PDFs (replace with database in production)
let pdfs: any[] = [];
let nextId = 1;

// Get all PDFs for the authenticated user
router.get('/', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let filteredPDFs;

    if (user.role === 'staff') {
      // Staff sees only their own PDFs
      filteredPDFs = pdfs.filter(pdf => pdf.authorId === req.user.id);
    } else {
      // Students see their own PDFs + shared PDFs from connected teachers
      const userTeacherCodes = user.teacherCodes || [];
      filteredPDFs = pdfs.filter(pdf => 
        pdf.authorId === req.user.id || 
        (pdf.isShared && userTeacherCodes.includes(pdf.teacherCode))
      );
    }

    res.json(filteredPDFs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload a new PDF
router.post('/upload', auth, async (req: any, res: any) => {
  try {
    const { filename, fileData, isShared } = req.body;

    if (!filename || !fileData) {
      return res.status(400).json({ message: 'Filename and file data are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPDF = {
      id: (nextId++).toString(),
      title: filename.replace('.pdf', ''),
      filename,
      fileData,
      authorId: req.user.id,
      authorName: user.registrationNumber,
      isShared: user.role === 'staff' ? (isShared || false) : false,
      teacherCode: user.role === 'staff' && isShared ? user.teacherCode : undefined,
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    pdfs.push(newPDF);
    res.status(201).json(newPDF);
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update PDF annotations
router.put('/:id', auth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { annotations, isShared } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pdfIndex = pdfs.findIndex(
      pdf => pdf.id === id && pdf.authorId === req.user.id
    );

    if (pdfIndex === -1) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    pdfs[pdfIndex] = {
      ...pdfs[pdfIndex],
      annotations: annotations || pdfs[pdfIndex].annotations,
      isShared: user.role === 'staff' ? (isShared !== undefined ? isShared : pdfs[pdfIndex].isShared) : false,
      teacherCode: user.role === 'staff' && (isShared !== undefined ? isShared : pdfs[pdfIndex].isShared) ? user.teacherCode : undefined,
      updatedAt: new Date().toISOString()
    };

    res.json(pdfs[pdfIndex]);
  } catch (error) {
    console.error('Error updating PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a PDF
router.delete('/:id', auth, (req: any, res: any) => {
  try {
    const { id } = req.params;

    const pdfIndex = pdfs.findIndex(
      pdf => pdf.id === id && pdf.authorId === req.user.id
    );

    if (pdfIndex === -1) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    pdfs.splice(pdfIndex, 1);
    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get PDF by teacher code (for students to access teacher's PDFs)
router.get('/teacher/:teacherCode/pdfs', auth, (req: any, res: any) => {
  try {
    const { teacherCode } = req.params;
    
    // Find teacher's PDFs by teacher code
    const teacherPDFs = pdfs.filter(pdf => {
      // This would need to be modified to lookup teacher by teacherCode
      // For now, returning empty array as this needs user lookup
      return false;
    });

    res.json(teacherPDFs);
  } catch (error) {
    console.error('Error fetching teacher PDFs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
