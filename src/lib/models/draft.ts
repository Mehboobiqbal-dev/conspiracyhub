'use server';

import { ObjectId } from 'mongodb';

export interface DraftMedia {
  url: string;
  type: 'image' | 'video';
  caption?: string;
  altText?: string;
  thumbnail?: string;
}

export interface Draft {
  _id?: ObjectId;
  authorId: ObjectId;
  title: string;
  content: string;
  type: 'conspiracy' | 'opinion';
  topicId?: ObjectId;
  topicSlug?: string;
  tags: string[];
  excerpt?: string;
  featuredImage?: string;
  media?: DraftMedia[];
  visibility?: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'scheduled';
  autosavedAt?: Date;
  scheduledFor?: Date;
  wordCount?: number;
}

export interface DraftSummary {
  _id: string;
  title: string;
  updatedAt: string;
  type: 'conspiracy' | 'opinion';
  topicSlug?: string;
}

