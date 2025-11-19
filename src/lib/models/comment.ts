import { ObjectId } from 'mongodb';

export interface Comment {
  _id?: ObjectId;
  postId: ObjectId;
  authorId: ObjectId;
  authorName?: string; // Denormalized
  authorAvatar?: string; // Denormalized
  content: string;
  parentId?: ObjectId; // For nested comments (replies)
  upvotes: number;
  downvotes: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  isDeleted: boolean;
  reportCount?: number;
  moderationStatus?: 'pending' | 'approved' | 'removed';
  moderatedBy?: ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
}

export interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

