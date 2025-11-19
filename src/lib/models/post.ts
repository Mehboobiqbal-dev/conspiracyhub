import { ObjectId } from 'mongodb';

export interface Post {
  _id?: ObjectId;
  title: string;
  content: string;
  type: 'conspiracy' | 'opinion';
  topicId?: ObjectId;
  topicSlug?: string; // Denormalized for easier queries
  authorId?: ObjectId; // null for AI-generated posts
  authorName?: string; // Denormalized
  isAIGenerated: boolean;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  views: number;
  tags: string[];
  slug: string; // SEO-friendly URL
  status: 'published' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  featuredImage?: string;
  excerpt?: string; // For SEO meta description
  reportCount?: number;
  moderationStatus?: 'pending' | 'approved' | 'removed';
  moderatedBy?: ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
}

export interface PostWithDetails extends Post {
  topic?: {
    _id: string;
    name: string;
    slug: string;
  };
  author?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

