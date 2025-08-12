import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout
});

// Mock data for when server is unavailable
const mockResponses = {
  '/auth/register': (data: any) => ({
    data: {
      message: 'Registration successful (DEMO MODE)',
      user: {
        _id: 'demo-user-1',
        registrationNumber: data.registrationNumber,
        role: data.role,
        year: data.year,
        semester: data.semester,
        course: data.course,
        subject: data.subject,
        teacherCode: data.role === 'staff' ? 'TC-DEMO123' : null
      },
      token: 'demo-jwt-token'
    }
  }),
  '/auth/login': (data: any) => ({
    data: {
      message: 'Login successful (DEMO MODE)',
      user: {
        _id: 'demo-user-1',
        registrationNumber: data.registrationNumber,
        role: 'student',
        year: 1,
        semester: 1,
        course: 'Computer Science'
      },
      token: 'demo-jwt-token'
    }
  }),
  '/notes/my': () => ({
    data: {
      notes: [
        {
          _id: 'demo-note-1',
          title: 'Welcome to NANNOTES (Demo)',
          content: 'This is a demo note. The backend server is currently unavailable, so this is mock data.',
          tags: ['demo', 'welcome'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
  }),
  '/notes': (data: any) => ({
    data: {
      message: 'Note created successfully (DEMO MODE)',
      note: {
        _id: `demo-note-${Date.now()}`,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  })
};

// Helper function to check if we should use mock data
const shouldUseMockData = (error: any) => {
  return error.code === 'ECONNREFUSED' || 
         error.code === 'NETWORK_ERROR' || 
         error.message?.includes('timeout') ||
         error.message?.includes('Network Error');
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and provide fallbacks
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error);
    
    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Check if we should provide mock data
    if (shouldUseMockData(error)) {
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      const data = error.config?.data ? JSON.parse(error.config.data) : {};
      
      // Find matching mock response
      for (const [mockUrl, mockResponse] of Object.entries(mockResponses)) {
        if (url.includes(mockUrl)) {
          console.log(`Using mock data for ${url}`);
          return Promise.resolve(mockResponse(data));
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
