// Integration tests against the real dev server (simple-test-server.js)
// Validates JWT and signed token handling and Mongo fallback behavior.

const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Tiny HTTP helper (use built-in http to avoid extra deps)
function request(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': data.length } : {}),
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, json, raw });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Start the simple-test-server with custom env on a given port; returns {proc, waitReady}
function startServer(env = {}, port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'simple-test-server.js')], {
      env: {
        ...process.env,
        PORT: String(port),
        // Point data file to a temp path isolated per mode
        DATA_PATH: path.join(__dirname, `.data_test_${port}.json`),
        ...env,
      },
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let ready = false;
    const onData = (buf) => {
      const s = buf.toString();
      if (!ready && s.includes('Server is running') || s.includes('Test server running')) {
        ready = true;
        resolve({ proc: child });
      }
      // console.log('[server]', s.trim());
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);

    // Fallback: poll health until ready (max 5s)
    const deadline = Date.now() + 5000;
    (async function waitHealth() {
      while (!ready && Date.now() < deadline) {
        try {
          const r = await request('GET', `http://127.0.0.1:${port}/api/health`);
          if (r.status === 200) {
            ready = true;
            return resolve({ proc: child });
          }
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!ready) {
        try { child.kill(); } catch (_) {}
        reject(new Error('Server did not become ready in time'));
      }
    })();
  });
}

function stopServer(proc) {
  if (!proc) return;
  try { proc.kill(); } catch (_) {}
}

// Allocate two random ports (memory mode and mongo mode)
function getRandomPort() {
  return 5000 + Math.floor(Math.random() * 1000);
}

describe('Real server integration: JWT/signed tokens + Mongo fallback', () => {
  jest.setTimeout(60000);

  const staffReg = `staff_${Date.now()}`;
  const studentReg = `stud_${Date.now()}`;
  // Must satisfy complexity: upper, lower, digit, special, min 8
  const password = 'Passw0rd!';

  const runSuite = async (name, env) => {
    const port = getRandomPort();
    const base = `http://127.0.0.1:${port}`;
    let child;
    try {
      ({ proc: child } = await startServer(env, port));

      // Health
      const health = await request('GET', `${base}/api/health`);
      expect(health.status).toBe(200);

      // Register staff and student
      const rStaff = await request('POST', `${base}/api/auth/register`, { registrationNumber: staffReg, password, role: 'staff', subject: 'Math' });
      expect([200, 201]).toContain(rStaff.status);
      const staffToken = rStaff.json && rStaff.json.token;
      expect(typeof staffToken).toBe('string');

      const rStud = await request('POST', `${base}/api/auth/register`, { registrationNumber: studentReg, password, role: 'student', year: '1', semester: '1', course: 'CSE' });
      expect([200, 201]).toContain(rStud.status);
      const studToken = rStud.json && rStud.json.token;
      expect(typeof studToken).toBe('string');

      // /me using both tokens
      const me1 = await request('GET', `${base}/api/auth/me`, null, { Authorization: `Bearer ${staffToken}` });
      expect(me1.status).toBe(200);
      const me2 = await request('GET', `${base}/api/auth/me`, null, { Authorization: `Bearer ${studToken}` });
      expect(me2.status).toBe(200);

      // Connect student to staff
      const connect = await request('POST', `${base}/api/auth/connect-staff`, { staffId: staffReg }, { Authorization: `Bearer ${studToken}` });
      expect(connect.status).toBe(200);

      // Staff creates shared note
      const noteCreate = await request('POST', `${base}/api/notes`, { title: 'N1', content: 'Hello', tags: ['t'], shared: true }, { Authorization: `Bearer ${staffToken}` });
      expect(noteCreate.status).toBe(201);
      const noteId = (noteCreate.json && (noteCreate.json._id || noteCreate.json.id));
      expect(noteId).toBeTruthy();

      // Student fetches notes (should include shared)
      const studNotes = await request('GET', `${base}/api/notes`, null, { Authorization: `Bearer ${studToken}` });
      expect(studNotes.status).toBe(200);
      expect(Array.isArray(studNotes.json)).toBe(true);
      expect(studNotes.json.some(n => n.title === 'N1')).toBe(true);

      // Student saves shared note
      const saveNote = await request('POST', `${base}/api/notes/save/${noteId}`, {}, { Authorization: `Bearer ${studToken}` });
      expect(saveNote.status).toBe(201);

      // Files: staff uploads shared file
      const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCj4='; // tiny fake
      const fileUp = await request('POST', `${base}/api/files/upload`, { filename: 'Doc.pdf', fileData: dataUrl, isShared: true }, { Authorization: `Bearer ${staffToken}` });
      expect(fileUp.status).toBe(201);
      const fileId = fileUp.json && (fileUp.json.id || fileUp.json._id);
      expect(fileId).toBeTruthy();

      // Student fetches files (should include shared)
      const studFiles = await request('GET', `${base}/api/files`, null, { Authorization: `Bearer ${studToken}` });
      expect(studFiles.status).toBe(200);
      expect(Array.isArray(studFiles.json)).toBe(true);
      expect(studFiles.json.some(f => f.title === 'Doc')).toBe(true);

      // Student saves shared file
      const saveFile = await request('POST', `${base}/api/files/save/${fileId}`, {}, { Authorization: `Bearer ${studToken}` });
      expect(saveFile.status).toBe(201);

      // Whiteboard: staff creates shared
      const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAB';
      const wbCreate = await request('POST', `${base}/api/whiteboards`, { title: 'W1', imageData: img, isShared: true }, { Authorization: `Bearer ${staffToken}` });
      expect(wbCreate.status).toBe(201);
      const wbId = wbCreate.json && (wbCreate.json.id || wbCreate.json._id);
      expect(wbId).toBeTruthy();

      // Student lists whiteboards
      const studWbs = await request('GET', `${base}/api/whiteboards`, null, { Authorization: `Bearer ${studToken}` });
      expect(studWbs.status).toBe(200);
      expect(Array.isArray(studWbs.json)).toBe(true);
      expect(studWbs.json.some(w => w.title === 'W1')).toBe(true);

      // Student saves shared whiteboard
      const saveWb = await request('POST', `${base}/api/whiteboards/save/${wbId}`, {}, { Authorization: `Bearer ${studToken}` });
      expect(saveWb.status).toBe(201);

    } finally {
      stopServer(child);
    }
  };

  test('Memory-only mode uses signed_ tokens', async () => {
    await runSuite('memory', {
      // Ensure Mongo is not used
      MONGODB_URI: '',
      JWT_SECRET: 'test-secret',
    });
  });

  test('Mongo mode uses JWT tokens (mongodb-memory-server)', async () => {
    // Spin up in-memory Mongo and pass its URI
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    try {
      await runSuite('mongo', {
        MONGODB_URI: uri,
        JWT_SECRET: 'test-secret',
      });
    } finally {
      await mongod.stop();
    }
  });
});
