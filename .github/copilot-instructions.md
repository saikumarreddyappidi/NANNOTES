<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# NANNOTES Project Instructions

This is a full-stack educational productivity web application with the following components:

## Project Structure
- `frontend/` - React TypeScript application with Tailwind CSS
- `backend/` - Node.js Express API with TypeScript and MongoDB
- `shared/` - Shared utilities and types

## Key Features
1. **Authentication System**: JWT-based auth with role-based access (student/staff)
2. **Notepad**: Rich text editor with Quill.js, tagging, and search functionality
3. **Whiteboard**: HTML5 Canvas drawing tool with save/load functionality
4. **PDF Manager**: PDF upload, viewing, and annotation system
5. **Teacher-Student System**: Staff can share notes with students using unique teacher codes

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Redux Toolkit, React Router
- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT
- **File Storage**: AWS S3 for file uploads
- **Additional Libraries**: React Quill, React Canvas Draw, PDF.js, Multer

## Code Style Guidelines
- Use TypeScript for type safety
- Follow React functional components with hooks
- Use Redux Toolkit for state management
- Implement proper error handling and validation
- Use async/await for asynchronous operations
- Follow RESTful API design principles

## Authentication Flow
- Users register with registration number and password
- Role-based registration (student requires year/semester/course, staff requires subject)
- Staff automatically get unique teacher codes
- Students can optionally enter teacher codes to access shared notes

## Database Models
- **User**: Registration info, role, academic details, teacher codes
- **Note**: Title, content, tags, author info, sharing status

## Security Considerations
- Password complexity validation
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting and CORS configuration

When working on this project, please:
- Maintain consistency with existing code patterns
- Add proper TypeScript types for all components
- Include error handling for all API calls
- Follow the established folder structure
- Test functionality across different user roles
