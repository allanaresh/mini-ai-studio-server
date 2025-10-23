import { Request, Response } from 'express';
import { Generation } from '../models/generation.model';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';

// Simulated delay to mimic AI processing
const SIMULATION_DELAY = 2000;
// Simulated failure rate (e.g., 15% of the time)
const FAILURE_RATE = 0;

export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file || !req.body.prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    const { prompt } = req.body;
    const uploadedPath = req.file.path;

    // Ensure generated folder exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    const generatedDir = path.join(uploadsDir, 'generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    // Simulate generation by copying the uploaded file to generated folder with a new name
    const generatedFilename = `gen-${Date.now()}${path.extname(uploadedPath)}`;
    const generatedPath = path.join(generatedDir, generatedFilename);
    fs.copyFileSync(uploadedPath, generatedPath);

    // Public path served by express static middleware
    const imagePath = `/uploads/generated/${generatedFilename}`;

    console.log('Generated image path:', imagePath);
    console.log('Full file path:', generatedPath);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));

    // Occasionally simulate an API error to test frontend handling
    if (Math.random() < FAILURE_RATE) {
      return res.status(500).json({ error: 'Simulated AI service error' });
    }

    // Create a new generation record
    const generation = new Generation({
      userId: (req.user as any)?._id,
      prompt,
      imagePath,
    });

    await generation.save();

    res.status(201).json({
      message: 'Generation created successfully',
      generation: {
        id: generation._id,
        prompt: generation.prompt,
        imagePath: generation.imagePath,
        createdAt: generation.createdAt
      }
    });
  } catch (error) {
    console.error('Error in image upload:', error);
    res.status(500).json({ error: 'Error processing image' });
  }
};

export const getRecentGenerations = async (req: AuthRequest, res: Response) => {
  try {
    const generations = await Generation.find({ userId: (req.user as any)?._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Map to consistent shape (id instead of _id)
    const mapped = generations.map(g => ({
      id: g._id,
      prompt: g.prompt,
      imagePath: g.imagePath,
      createdAt: g.createdAt,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Error fetching generations' });
  }
};