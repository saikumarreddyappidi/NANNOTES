# Frontend - NANNOTES

React-based frontend for the NANNOTES educational productivity platform.

## 🚀 Quick Start

```bash
npm install
npm start
```

## 📦 Dependencies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **React Quill** - Rich text editor
- **React Canvas Draw** - Whiteboard functionality
- **Axios** - HTTP client

## 🏗 Project Structure

```
src/
├── components/         # React components
│   ├── Dashboard.tsx   # Main dashboard layout
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   ├── Notepad.tsx     # Notes management
│   ├── Whiteboard.tsx  # Drawing canvas
│   └── PDFManager.tsx  # PDF viewer and annotations
├── store/             # Redux store
│   ├── index.ts       # Store configuration
│   ├── authSlice.ts   # Authentication state
│   └── notesSlice.ts  # Notes state
├── services/          # API services
│   └── api.ts         # Axios configuration
├── types/             # TypeScript definitions
│   └── index.ts       # Type definitions
└── App.tsx            # Main app component
```

## 🎨 Components

### Authentication
- **Login**: User authentication
- **Register**: User registration with role selection

### Dashboard
- **Dashboard**: Main layout with sidebar and header
- **DashboardHome**: Overview page with stats and quick actions

### Core Features
- **Notepad**: Rich text editor with tagging and search
- **Whiteboard**: Drawing canvas with tools and save functionality
- **PDFManager**: PDF upload, viewing, and annotation

## 🔧 Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🌐 Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🎯 Features

- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode**: Theme switching (optional)
- **Real-time Updates**: Live data synchronization
- **Offline Support**: PWA capabilities (optional)
- **Accessibility**: WCAG compliant components
