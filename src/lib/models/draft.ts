'use server';

import { ObjectId } from 'mongodb';

export interface DraftMedia {
  url: string;
  type: 'image' | 'video';
  caption?: string;
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
  createdAt: Date;
  updatedAt: Date;
  status: 'draft';
}

export interface DraftSummary {
  _id: string;
  title: string;
  updatedAt: string;
  type: 'conspiracy' | 'opinion';
  topicSlug?: string;
}

