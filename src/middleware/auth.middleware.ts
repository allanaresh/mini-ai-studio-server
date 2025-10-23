import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Auth middleware - checking token');
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('No authorization header found');
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('Authorization header is not Bearer');
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Verifying token...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
    console.log('Token verified, userId:', decoded.userId);
    
    // Attach user info to request
    req.user = { _id: decoded.userId } as any;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};