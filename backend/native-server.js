const http = require('http');
const url = require('url');

const PORT = 5004;
const users = [];
const notes = [];

// Helper function to parse JSON body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (err) {
      callback(err, null);
    }
  });
}

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Health check
  if (path === '/api/health' && method === 'GET') {
    sendJSON(res, 200, {
      status: 'OK',
      message: 'Server is running!',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Registration
  if (path === '/api/auth/register' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, { error: 'Invalid JSON' });
        return;
      }

      const { registrationNumber, password, role, year, semester, course, subject } = body;
      
      if (!registrationNumber || !password || !role) {
        sendJSON(res, 400, { error: 'Missing required fields' });
        return;
      }

      const existingUser = users.find(u => u.registrationNumber === registrationNumber);
      if (existingUser) {
        sendJSON(res, 400, { error: 'User already exists' });
        return;
      }

      const user = {
        _id: users.length + 1,
        registrationNumber,
        password,
        role,
        year,
        semester,
        course,
        subject,
        teacherCode: role === 'staff' ? `TC${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null,
        createdAt: new Date().toISOString()
      };

      users.push(user);
      console.log('User registered:', user.registrationNumber);

      sendJSON(res, 201, {
        message: 'Registration successful',
        user: { ...user, password: undefined },
        token: `mock_jwt_${user._id}_${Date.now()}`
      });
    });
    return;
  }

  // Login
  if (path === '/api/auth/login' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, { error: 'Invalid JSON' });
        return;
      }

      const { registrationNumber, password } = body;
      
      if (!registrationNumber || !password) {
        sendJSON(res, 400, { error: 'Missing credentials' });
        return;
      }

      const user = users.find(u => u.registrationNumber === registrationNumber && u.password === password);
      if (!user) {
        sendJSON(res, 401, { error: 'Invalid credentials' });
        return;
      }

      console.log('User logged in:', user.registrationNumber);
      sendJSON(res, 200, {
        message: 'Login successful',
        user: { ...user, password: undefined },
        token: `mock_jwt_${user._id}_${Date.now()}`
      });
    });
    return;
  }

  // Get notes
  if (path === '/api/notes/my' && method === 'GET') {
    sendJSON(res, 200, { notes: notes });
    return;
  }

  // Create note
  if (path === '/api/notes' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, { error: 'Invalid JSON' });
        return;
      }

      const { title, content, tags } = body;
      
      if (!title || !content) {
        sendJSON(res, 400, { error: 'Title and content are required' });
        return;
      }

      const note = {
        _id: notes.length + 1,
        title,
        content,
        tags: tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      notes.push(note);
      console.log('Note created:', note._id);

      sendJSON(res, 201, {
        message: 'Note created successfully',
        note: note
      });
    });
    return;
  }

  // 404 for other routes
  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Native HTTP server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`💓 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL: http://localhost:3000`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
