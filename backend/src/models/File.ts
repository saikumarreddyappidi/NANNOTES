import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  fileName: string;
  originalName: string;
  fileType: 'pdf' | 'image' | 'drawing' | 'document';
  fileSize: number;
  filePath: string;
  fileUrl?: string;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploaderInfo: {
    registrationNumber: string;
    role: 'student' | 'staff';
  };
  isPublic: boolean;
  sharedWith: {
    year?: string;
    semester?: string;
    course?: string;
    subject?: string;
  };
  annotations?: {
    page: number;
    type: 'highlight' | 'note' | 'drawing';
    content: string;
    position: {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
    author: mongoose.Types.ObjectId;
    createdAt: Date;
  }[];
  tags: string[];
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>({
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'image', 'drawing', 'document'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderInfo: {
    registrationNumber: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'staff'],
      required: true
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: {
    year: String,
    semester: String,
    course: String,
    subject: String
  },
  annotations: [{
    page: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['highlight', 'note', 'drawing'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: Number,
      height: Number
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  downloadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fileSchema.index({ uploadedBy: 1, createdAt: -1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ 'uploaderInfo.role': 1, isPublic: 1 });
fileSchema.index({ 'sharedWith.year': 1, 'sharedWith.semester': 1, 'sharedWith.course': 1 });

export default mongoose.model<IFile>('File', fileSchema);
