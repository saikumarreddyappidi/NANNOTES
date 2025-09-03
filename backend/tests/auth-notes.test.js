const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp, User, Note, File, Whiteboard } = require('./app');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Note.deleteMany({});
  await File.deleteMany({});
  await Whiteboard.deleteMany({});
});

test('register, login, create and list notes (staff)', async () => {
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ registrationNumber: 'STAFFT', password: 'Password@123', role: 'staff', subject: 'Math' })
    .expect(201);

  const token = regRes.body.token;
  expect(token).toBeTruthy();

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ registrationNumber: 'STAFFT', password: 'Password@123' })
    .expect(200);
  const jwt = loginRes.body.token;
  expect(jwt).toBeTruthy();

  const createRes = await request(app)
    .post('/api/notes')
    .set('Authorization', `Bearer ${jwt}`)
    .send({ title: 'T1', content: 'Hello', shared: true })
    .expect(201);
  expect(createRes.body.title).toBe('T1');

  const listRes = await request(app)
    .get('/api/notes')
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);
  expect(Array.isArray(listRes.body)).toBe(true);
  expect(listRes.body.length).toBe(1);
});

test('login fails with wrong password', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ registrationNumber: 'U1', password: 'Password@123', role: 'student', year: '2025', semester: '1', course: 'CSE' })
    .expect(201);
  await request(app)
    .post('/api/auth/login')
    .send({ registrationNumber: 'U1', password: 'WrongPass' })
    .expect(401);
});

test('files: create, list, delete (staff)', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ registrationNumber: 'S1', password: 'Password@123', role: 'staff', subject: 'Phy' })
    .expect(201);
  const jwt = reg.body.token;

  const created = await request(app)
    .post('/api/files')
    .set('Authorization', `Bearer ${jwt}`)
    .send({ title: 'File A', fileUrl: 'http://example.com/a.pdf', filename: 'a.pdf', isShared: true })
    .expect(201);
  expect(created.body.title).toBe('File A');

  const list = await request(app)
    .get('/api/files')
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);
  expect(list.body.length).toBe(1);

  await request(app)
    .delete(`/api/files/${created.body._id}`)
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);

  const list2 = await request(app)
    .get('/api/files')
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);
  expect(list2.body.length).toBe(0);
});

test('whiteboards: create, list, delete (student cannot share)', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ registrationNumber: 'U2', password: 'Password@123', role: 'student', year: '2025', semester: '1', course: 'CSE' })
    .expect(201);
  const jwt = reg.body.token;

  const created = await request(app)
    .post('/api/whiteboards')
    .set('Authorization', `Bearer ${jwt}`)
    .send({ title: 'W1', imageData: 'data:image/png;base64,AAA', isShared: true })
    .expect(201);
  expect(created.body.title).toBe('W1');
  expect(created.body.isShared).toBe(false);

  const list = await request(app)
    .get('/api/whiteboards')
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);
  expect(list.body.length).toBe(1);

  await request(app)
    .delete(`/api/whiteboards/${created.body._id}`)
    .set('Authorization', `Bearer ${jwt}`)
    .expect(200);
});
