import { ObjectId } from 'mongodb';

export interface Tournament {
  _id?: ObjectId;
  name: string;
  description: string;
  topic: string;
  organizerId: ObjectId;
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  settings: {
    maxParticipants: number;
    entryFee: number;
    prizePool: {
      first: number;
      second: number;
      third: number;
    };
    format: 'single-elimination' | 'double-elimination' | 'round-robin';
    allowAI: boolean;
    premiumOnly: boolean;
  };
  participants: Array<{
    userId: ObjectId;
    name: string;
    avatar?: string;
    registeredAt: Date;
    seed?: number;
    isPremium: boolean;
    status: 'registered' | 'active' | 'eliminated' | 'winner';
  }>;
  brackets: Array<{
    round: number;
    matches: Array<{
      matchId: string;
      participant1Id: ObjectId;
      participant2Id: ObjectId;
      scheduledAt: Date;
      startedAt?: Date;
      endedAt?: Date;
      winnerId?: ObjectId;
      scores: {
        participant1: number;
        participant2: number;
      };
      spectators: number;
      votes: Array<{
        userId: ObjectId;
        votedFor: ObjectId;
        timestamp: Date;
      }>;
    }>;
  }>;
  leaderboard: Array<{
    userId: ObjectId;
    name: string;
    avatar?: string;
    wins: number;
    points: number;
    rank: number;
  }>;
  rewards: Array<{
    userId: ObjectId;
    type: 'nft' | 'token' | 'badge';
    tokenId?: string;
    transactionHash?: string;
    claimed: boolean;
    claimedAt?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

