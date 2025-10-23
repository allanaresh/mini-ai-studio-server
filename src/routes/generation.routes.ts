import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage, getRecentGenerations } from '../controllers/generation.controller';
import asyncHandler from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const generatedDir = path.join(uploadsDir, 'generated');
    
    // Create both directories if they don't exist
    [uploadsDir, generatedDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg formats are allowed!'));
  }
});

// Routes
router.post('/upload', authMiddleware, upload.single('image'), asyncHandler(uploadImage as any));
router.get('/recent', authMiddleware, asyncHandler(getRecentGenerations as any));

export default router;