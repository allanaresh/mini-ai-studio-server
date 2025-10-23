import express, { Express } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

// Middleware
app.use(cors({
  origin: "*",
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Routes
import authRoutes from './routes/auth.routes';
import generationRoutes from './routes/generation.routes';

app.use('/api/auth', authRoutes);
app.use('/api/generations', generationRoutes);

// Serve uploads as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Enable CORS for image files
app.use((req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Centralized error handler (should be after routes)
import { errorHandler } from './middleware/error.middleware';
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

export default app;
