# Backend - NANNOTES

Node.js/Express backend API for the NANNOTES educational productivity platform.

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your configurations
npm run dev
```

## 📦 Dependencies

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB/Mongoose** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **AWS SDK** - S3 file storage
- **bcryptjs** - Password hashing

## 🏗 Project Structure

```
src/
├── models/            # MongoDB models
│   ├── User.ts        # User model
│   └── Note.ts        # Note model
├── routes/            # Express routes
│   ├── auth.ts        # Authentication routes
│   ├── notes.ts       # Notes CRUD routes
│   └── files.ts       # File upload routes
├── middleware/        # Custom middleware
│   ├── auth.ts        # JWT authentication
│   ├── errorHandler.ts # Error handling
│   └── notFound.ts    # 404 handler
└── server.ts          # Main server file
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

## 🌐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=5003
MONGODB_URI=mongodb://localhost:27017/nannotes
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nannotes-uploads
CORS_ORIGIN=http://localhost:3000
```

## 🔑 Password Policy

User passwords must meet the following minimum requirements:

- At least 8 characters long
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (for example: ! @ # $ % ^ & *)

Examples that pass: `Passw0rd!`, `Str0ng#Key`

If registration fails with a 400 error, ensure the password meets these rules.

## 📊 Database Models

### User Model
```typescript
{
  registrationNumber: string;
  password: string;
  role: 'student' | 'staff';
  year?: string;
  semester?: string;
  course?: string;
  teacherCode?: string;
  subject?: string;
  createdAt: Date;
}
```

### Note Model
```typescript
{
  title: string;
  content: string;
  tags: string[];
  authorId: ObjectId;
  authorName: string;
  teacherCode?: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Notes
- `GET /api/notes` - Get user's notes + shared notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/search` - Search notes

### Files
- `POST /api/files/upload` - Upload file to S3
- `GET /api/files/signed-url/:fileName` - Get signed URL
- `DELETE /api/files/:fileName` - Delete file

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: express-validator
- **Rate Limiting**: Protection against abuse
- **CORS**: Configured cross-origin requests
- **Helmet**: Security headers

## 🗃 Database Setup

### Local MongoDB
```bash
# Install MongoDB
# Start MongoDB service
mongod

# Connect to database
mongo
use nannotes
```

### MongoDB Atlas
1. Create cluster on MongoDB Atlas
2. Get connection string
3. Update MONGODB_URI in .env

## ☁️ AWS S3 Setup

1. Create S3 bucket
2. Create IAM user with S3 permissions
3. Get access keys
4. Update AWS credentials in .env

## 🚀 Deployment

### Heroku
```bash
heroku create nannotes-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=<your-mongodb-uri>
# Set other environment variables
git push heroku main
```

### AWS EC2
```bash
# Build the application
npm run build

# Start with PM2
pm2 start dist/server.js --name nannotes-api
```
