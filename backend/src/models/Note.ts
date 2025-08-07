import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  title: string;
  content: string;
  tags: string[];
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  teacherCode?: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  teacherCode: {
    type: String,
    default: null
  },
  isShared: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search functionality
noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ tags: 1 });
noteSchema.index({ authorId: 1 });
noteSchema.index({ teacherCode: 1 });

export default mongoose.model<INote>('Note', noteSchema);
