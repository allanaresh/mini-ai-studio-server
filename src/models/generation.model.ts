import mongoose, { Document } from 'mongoose';

export interface IGeneration extends Document {
  userId: mongoose.Types.ObjectId;
  prompt: string;
  imagePath: string;
  createdAt: Date;
}

const generationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  imagePath: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Generation = mongoose.model<IGeneration>('Generation', generationSchema);