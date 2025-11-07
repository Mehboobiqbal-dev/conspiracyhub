import { ObjectId } from 'mongodb';

export interface Opinion {
  _id?: ObjectId;
  userId: ObjectId;
  content: string;
  topic?: string;
  category: string;
  bias?: {
    detected: boolean;
    type?: string;
    score?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  dislikes: number;
  views: number;
  isPublic: boolean;
  tags: string[];
}

export interface EchoSimulation {
  _id?: ObjectId;
  opinionId: ObjectId;
  userId: ObjectId;
  echoFeed: Array<{
    id: string;
    content: string;
    author: string;
    timestamp: Date;
    absurdity: number;
  }>;
  bustMode: Array<{
    id: string;
    counterArgument: string;
    source?: string;
    credibility: number;
  }>;
  memeReport?: {
    url: string;
    generatedAt: Date;
  };
  rating?: number;
  completedAt?: Date;
  createdAt: Date;
}

