import { ObjectId } from 'mongodb';

export interface Arena {
  _id?: ObjectId;
  title: string;
  topic: string;
  creatorId: ObjectId;
  participants: Array<{
    userId: ObjectId;
    name: string;
    avatar?: string;
    joinedAt: Date;
    isAI?: boolean;
  }>;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  settings: {
    maxParticipants: number;
    roundDuration: number; // seconds
    maxRounds: number;
    allowVoice: boolean;
    public: boolean;
    moderationEnabled: boolean;
  };
  rounds: Array<{
    roundNumber: number;
    startedAt: Date;
    endedAt?: Date;
    arguments: Array<{
      userId: ObjectId;
      content: string;
      timestamp: Date;
      reactions: Array<{
        userId: ObjectId;
        type: 'like' | 'dislike' | 'agree' | 'disagree';
      }>;
      votes: number;
      fallacies?: Array<{
        type: string;
        detectedAt: Date;
      }>;
    }>;
  }>;
  currentRound: number;
  scores: Array<{
    userId: ObjectId;
    points: number;
    wins: number;
  }>;
  transcript?: string;
  recap?: {
    summary: string;
    keyPoints: string[];
    winner?: ObjectId;
    generatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

