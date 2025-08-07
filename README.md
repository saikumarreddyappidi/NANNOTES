# NANNOTES - Educational Productivity Platform

A comprehensive full-stack web application designed for educational productivity, featuring user authentication, note-taking, whiteboard drawing, PDF management, and teacher-student collaboration through unique teacher codes.

## 🚀 Features

### 🔐 Authentication System
- **User Registration**: Students and Staff with role-based registration
- **Secure Login**: JWT-based authentication
- **Role Management**: Different interfaces and permissions for Students and Staff
- **Teacher Codes**: Unique codes for staff to share notes with students

### 📝 Notepad
- **Rich Text Editor**: Powered by Quill.js for advanced formatting
- **Tag System**: Organize notes with custom tags (#project, #calculus, etc.)
- **Search Functionality**: Search by title, content, or tags
- **Note Sharing**: Staff can share notes with students using Teacher Codes
- **CRUD Operations**: Full create, read, update, delete functionality

### 🎨 Whiteboard / Paint Tool
- **Drawing Canvas**: HTML5 Canvas with react-canvas-draw
- **Drawing Tools**: Pen with customizable color and size
- **Eraser Tool**: Remove parts of drawings
- **Save Drawings**: Export as PNG and save to cloud storage
- **Drawing Management**: View, load, and delete saved drawings

### 📄 PDF Manager
- **PDF Upload**: Upload and manage PDF documents
- **PDF Viewer**: Built-in viewer using PDF.js
- **Annotations**: 
  - Highlight text
  - Add text boxes
  - Draw on PDFs
- **Save Annotations**: Persistent annotation storage

### 👨‍🏫 Teacher-Student System
- **Teacher Codes**: Staff generate unique codes for their classes
- **Note Sharing**: Teachers can share notes tagged with their Teacher Code
- **Student Access**: Students with matching Teacher Codes see shared notes
- **Role-based Features**: Different capabilities for Students vs Staff

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Router** for navigation
- **React Quill** for rich text editing
- **React Canvas Draw** for whiteboard functionality
- **PDF.js** for PDF viewing and annotation

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **AWS S3** for file storage
- **bcryptjs** for password hashing

### Database
- **MongoDB** for primary data storage
- **Text indexing** for search functionality
- **GridFS** or **AWS S3** for file storage

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- AWS Account (for S3 storage)

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configurations
# - MongoDB connection string
# - JWT secret
# - AWS credentials

npm run dev
```

### Environment Variables (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nannotes
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=nannotes-uploads
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd nannotes
```

2. **Install dependencies**
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. **Set up environment variables**
```bash
cd backend
cp .env.example .env
# Edit .env with your configurations
```

4. **Start the development servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📱 Usage

### For Students
1. **Register** with registration number, password, year, semester, course
2. **Optional**: Enter Teacher Code to access shared notes
3. **Create Notes**: Write and organize personal notes with tags
4. **Use Whiteboard**: Create drawings and sketches
5. **Manage PDFs**: Upload, view, and annotate PDF documents
6. **View Shared Notes**: Access notes shared by teachers

### For Staff
1. **Register** with registration number, password, subject, year/semester
2. **Receive Teacher Code**: Automatically generated unique code
3. **Create and Share Notes**: Write notes and mark them as shared
4. **Manage Content**: Full access to personal notes and drawings
5. **Share Teacher Code**: Provide code to students for note access

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
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

## 🗂 Project Structure

```
nannotes/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/         # Redux store and slices
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript type definitions
│   │   └── styles/        # Tailwind CSS styles
│   └── public/
├── backend/
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # Express routes
│   │   ├── middleware/    # Custom middleware
│   │   └── server.ts      # Main server file
│   └── dist/             # Compiled JavaScript
└── shared/               # Shared utilities and types
```

## 🔒 Security Features

- **Password Validation**: Complex password requirements
- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Different permissions for students/staff
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Protection against API abuse
- **CORS Configuration**: Controlled cross-origin requests
- **Helmet Security**: Security headers for Express

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy build folder
```

### Backend (AWS EC2/Heroku)
```bash
cd backend
npm run build
npm start
```

### Database (MongoDB Atlas)
- Set up MongoDB Atlas cluster
- Update MONGODB_URI in environment variables

### File Storage (AWS S3)
- Create S3 bucket
- Configure IAM user with S3 permissions
- Update AWS credentials in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **NANNOTES Development Team**

## 🆘 Support

For support, email team@nannotes.com or create an issue in the repository.

---

**NANNOTES** - Empowering Education Through Technology 🚀
