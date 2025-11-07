import { ObjectId } from 'mongodb';

export interface UserAnalytics {
  _id?: ObjectId;
  userId: ObjectId;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: Date;
  metrics: {
    opinionsCreated: number;
    arenasParticipated: number;
    tournamentsJoined: number;
    guildsJoined: number;
    timeCapsulesCreated: number;
    totalEngagement: number;
    biasScore?: number;
    topicsEngaged: string[];
  };
  createdAt: Date;
}

export interface GlobalAnalytics {
  _id?: ObjectId;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    totalOpinions: number;
    totalArenas: number;
    totalTournaments: number;
    trendingTopics: Array<{
      topic: string;
      engagement: number;
      sentiment: 'positive' | 'negative' | 'neutral';
    }>;
    biasTrends: Array<{
      category: string;
      averageScore: number;
      distribution: Record<string, number>;
    }>;
    regionalData?: Array<{
      region: string;
      userCount: number;
      engagement: number;
    }>;
  };
  createdAt: Date;
}

export interface ModerationLog {
  _id?: ObjectId;
  contentId: string;
  contentType: 'opinion' | 'arena' | 'guild_post' | 'comment';
  userId?: ObjectId;
  action: 'flag' | 'auto_moderate' | 'manual_review' | 'approve' | 'reject' | 'ban';
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  moderatorId?: ObjectId;
  aiConfidence?: number;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

