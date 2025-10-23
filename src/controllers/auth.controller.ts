import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({ email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({ user: { id: user._id, email: user.email }, token });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' } // Extend token expiration to 7 days
    );

    res.json({ user: { id: user._id, email: user.email }, token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Token verification endpoint
export const verify = async (req: Request, res: Response) => {
  try {
    console.log('Token verification request received');
    // If the request reaches here, it means the token is valid (checked by authMiddleware)
    console.log('Token is valid, user:', (req as any).user);
    res.status(200).json({ 
      valid: true,
      user: (req as any).user 
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false });
  }
};