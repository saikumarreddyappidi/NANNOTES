import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  registrationNumber: string;
  password: string;
  role: 'student' | 'staff';
  year?: string;
  semester?: string;
  course?: string;
  teacherCode?: string;
  teacherCodes?: string[]; // Array of teacher codes for students
  subject?: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['student', 'staff'],
    required: true
  },
  year: {
    type: String,
    required: function(this: IUser) {
      return this.role === 'student' || this.role === 'staff';
    }
  },
  semester: {
    type: String,
    required: function(this: IUser) {
      return this.role === 'student' || this.role === 'staff';
    }
  },
  course: {
    type: String,
    required: function(this: IUser) {
      return this.role === 'student';
    }
  },
  subject: {
    type: String,
    required: function(this: IUser) {
      return this.role === 'staff';
    }
  },
  teacherCode: {
    type: String,
    unique: true,
    sparse: true,
    required: function(this: IUser) {
      return this.role === 'staff';
    }
  },
  teacherCodes: [{
    type: String
  }], // Array of teacher codes that students have added
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
