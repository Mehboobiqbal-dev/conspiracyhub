import { ObjectId } from 'mongodb';

export interface Guild {
  _id?: ObjectId;
  name: string;
  description: string;
  theme: string;
  ownerId: ObjectId;
  members: Array<{
    userId: ObjectId;
    role: 'owner' | 'admin' | 'moderator' | 'member';
    joinedAt: Date;
    status: 'active' | 'banned' | 'left';
  }>;
  settings: {
    public: boolean;
    inviteOnly: boolean;
    requireApproval: boolean;
    maxMembers?: number;
  };
  forums: Array<{
    postId: ObjectId;
    title: string;
    content: string;
    authorId: ObjectId;
    createdAt: Date;
    replies: number;
    views: number;
    pinned: boolean;
    locked: boolean;
  }>;
  challenges: Array<{
    challengeId: ObjectId;
    title: string;
    description: string;
    type: 'debate' | 'discussion' | 'poll' | 'collaboration';
    startDate: Date;
    endDate: Date;
    participants: ObjectId[];
    rewards?: string[];
  }>;
  stats: {
    totalMembers: number;
    totalPosts: number;
    activeMembers: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

