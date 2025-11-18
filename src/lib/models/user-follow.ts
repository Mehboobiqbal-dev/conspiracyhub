import { ObjectId } from 'mongodb';

export interface UserFollow {
  _id?: ObjectId;
  followerId: ObjectId;
  followingId: ObjectId;
  createdAt: Date;
}

export interface UserStats {
  _id?: ObjectId;
  userId: ObjectId;
  followerCount: number;
  followingCount: number;
  postCount: number;
  commentCount: number;
  totalUpvotes: number;
  totalDownvotes: number;
  karma: number;
  savedPosts: ObjectId[];
  followedTopics: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

