import { Router } from 'express';
import { register, login, verify } from '../controllers/auth.controller';
import asyncHandler from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', asyncHandler(register as any));
router.post('/login', asyncHandler(login as any));
router.get('/verify', authMiddleware, asyncHandler(verify as any));

export default router;