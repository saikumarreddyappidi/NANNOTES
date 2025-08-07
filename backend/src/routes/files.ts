import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { auth } from '../middleware/auth';

const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and images
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
});

// Upload file to S3
router.post('/upload', auth, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const fileName = `${req.user.userId}/${Date.now()}-${req.file.originalname}`;
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET || 'nannotes-uploads',
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private' // Only authenticated users can access
    };

    const result = await s3.upload(uploadParams).promise();

    res.json({
      message: 'File uploaded successfully',
      fileUrl: result.Location,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// Get signed URL for private file access
router.get('/signed-url/:fileName', auth, async (req: any, res: any) => {
  try {
    const fileName = req.params.fileName;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'nannotes-uploads',
      Key: fileName,
      Expires: 3600 // URL expires in 1 hour
    };

    const signedUrl = s3.getSignedUrl('getObject', params);
    
    res.json({ signedUrl });
  } catch (error: any) {
    console.error('Signed URL error:', error);
    res.status(500).json({ message: 'Failed to generate signed URL' });
  }
});

// Delete file from S3
router.delete('/:fileName', auth, async (req: any, res: any) => {
  try {
    const fileName = req.params.fileName;
    
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET || 'nannotes-uploads',
      Key: fileName
    };

    await s3.deleteObject(deleteParams).promise();
    
    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('File delete error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

export default router;
