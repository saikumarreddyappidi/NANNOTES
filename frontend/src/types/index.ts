export interface User {
  _id?: string;
  id?: string;
  registrationNumber: string;
  name?: string;
  role: 'student' | 'staff';
  year?: string;
  semester?: string;
  course?: string;
  teacherCode?: string;
  connectedTeachers?: string[];
  subject?: string;
  createdAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  author: string;
  authorName: string;
  teacherCode?: string;
  isShared: boolean;
  sharedWith?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Drawing {
  id: string;
  title: string;
  imageUrl: string;
  authorId: string;
  createdAt: string;
}

export interface PDFFile {
  id: string;
  title: string;
  filename: string;
  fileUrl: string;
  annotations?: PDFAnnotation[];
  authorId: string;
  createdAt: string;
}

export interface PDFAnnotation {
  id: string;
  type: 'highlight' | 'text' | 'drawing';
  page: number;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  content?: string;
  color?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface NotesState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
}

export interface DrawingsState {
  drawings: Drawing[];
  isLoading: boolean;
  error: string | null;
}

export interface PDFState {
  pdfs: PDFFile[];
  currentPDF: PDFFile | null;
  isLoading: boolean;
  error: string | null;
}
