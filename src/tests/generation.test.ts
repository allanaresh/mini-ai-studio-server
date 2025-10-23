import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import app from '../index';
import { Generation } from '../models/generation.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let testUserId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Ensure any existing mongoose connection is closed before connecting to the memory server
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch (err) {
      // If disconnect fails, log and continue to attempt connect
      // eslint-disable-next-line no-console
      console.warn('mongoose.disconnect() during test setup failed:', err);
    }
  }
  await mongoose.connect(uri);

  // Create test directories
  const uploadsDir = path.join(__dirname, '../../uploads');
  const generatedDir = path.join(uploadsDir, 'generated');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Create a test user and get auth token
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

  console.log('Registration response:', response.body);
  
  authToken = response.body.token;
  testUserId = response.body.user.id;  // Changed from _id to id

  // Log the captured values
  console.log('Auth token:', authToken);
  console.log('Test user ID:', testUserId);
});

afterAll(async () => {
  await Generation.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Generation endpoints', () => {
  const testImagePath = path.join(__dirname, 'test-image.jpg');

  beforeAll(() => {
    // Create a test image file with actual image content (a small black pixel)
    const blackPixel = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D
    ]);
    fs.writeFileSync(testImagePath, blackPixel);
  });

  afterAll(() => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('should upload an image and receive a generation', async () => {
    const response = await request(app)
      .post('/api/generations/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('prompt', 'test prompt')
      .attach('image', testImagePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('generation');
    expect(response.body.generation).toHaveProperty('id');
    expect(response.body.generation).toHaveProperty('imagePath');
    expect(response.body.generation).toHaveProperty('prompt', 'test prompt');
    expect(response.body).toHaveProperty('message', 'Generation created successfully');
  });

  it('should fail without authentication', async () => {
    try {
      const response = await request(app)
        .post('/api/generations/upload')
        .field('prompt', 'test prompt')
        .attach('image', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    } catch (error: any) {
      // If the server closed the connection, that's also a valid failure case
      if (error?.code !== 'ECONNRESET') {
        throw error;
      }
    }
  });

  it('should fail without an image', async () => {
    const response = await request(app)
      .post('/api/generations/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('prompt', 'test prompt');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should fail without a prompt', async () => {
    const response = await request(app)
      .post('/api/generations/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', testImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  describe('Recent generations', () => {
    beforeEach(async () => {
      // Clean up existing generations
      await Generation.deleteMany({});

      // Create test generations directly in the database
      await Generation.create([
        {
          userId: new mongoose.Types.ObjectId(testUserId),
          prompt: 'test prompt 1',
          imagePath: '/path/to/image1.jpg',
          createdAt: new Date(Date.now() - 1000)
        },
        {
          userId: new mongoose.Types.ObjectId(testUserId),
          prompt: 'test prompt 2',
          imagePath: '/path/to/image2.jpg',
          createdAt: new Date(Date.now() - 2000)
        }
      ]);
    });

    it('should return recent generations for authenticated user', async () => {
      // Verify the generations were created
      const count = await Generation.countDocuments();
      console.log('Generations in database:', count);

      const response = await request(app)
        .get('/api/generations/recent')
        .set('Authorization', `Bearer ${authToken}`);

      // Log full response for debugging
      console.log('Response:', response.body);
      console.log('Test user ID:', testUserId);
      
      // Find generations in DB to confirm
      const dbGens = await Generation.find({ userId: testUserId });
      console.log('DB Generations:', dbGens);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      // Update assertions to match the actual response structure
      const generations = response.body;
      expect(generations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            prompt: 'test prompt 1',
            imagePath: '/path/to/image1.jpg'
          }),
          expect.objectContaining({
            prompt: 'test prompt 2',
            imagePath: '/path/to/image2.jpg'
          })
        ])
      );
    });

    it('should return empty array for user with no generations', async () => {
      // Create a new user
      const newUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        });

      const newUserToken = newUserResponse.body.token;

      const response = await request(app)
        .get('/api/generations/recent')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/generations/recent');

      expect(response.status).toBe(401);
    });
  });
});