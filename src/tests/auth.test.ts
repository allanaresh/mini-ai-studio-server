import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../index';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Ensure any existing mongoose connection is closed before connecting to the memory server
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch (err) {
      // If disconnect fails, log and continue to attempt connect
      // Tests should still proceed using the memory server
      // eslint-disable-next-line no-console
      console.warn('mongoose.disconnect() during test setup failed:', err);
    }
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth endpoints', () => {
  it('should register and login a user', async () => {
    const email = 'test@example.com';
    const password = 'password123';

    // Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(registerRes.body).toHaveProperty('token');
    expect(registerRes.body.user.email).toBe(email);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.email).toBe(email);
  });
});
