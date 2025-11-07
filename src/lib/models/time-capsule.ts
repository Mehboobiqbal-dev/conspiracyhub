import { ObjectId } from 'mongodb';

export interface TimeCapsule {
  _id?: ObjectId;
  userId: ObjectId;
  content: string;
  topic: string;
  collaborators: Array<{
    userId: ObjectId;
    addedAt: Date;
  }>;
  unlockDate: Date;
  sealedAt: Date;
  blockchainHash?: string;
  transactionHash?: string;
  status: 'sealed' | 'unlocked' | 'opened';
  aiPrediction?: {
    predictedViews: string[];
    confidence: number;
    generatedAt: Date;
  };
  actualViews?: {
    content: string;
    reflection: string;
    openedAt: Date;
  };
  reminders: Array<{
    sentAt: Date;
    method: 'email' | 'push' | 'sms';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

