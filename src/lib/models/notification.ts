import { ObjectId } from 'mongodb';

export type NotificationType = 
  | 'comment_reply'
  | 'post_reply'
  | 'vote_up'
  | 'vote_down'
  | 'user_follow'
  | 'post_mention'
  | 'ai_generated'
  | 'moderation_action'
  | 'topic_update';

export interface Notification {
  _id?: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedUserId?: ObjectId;
  relatedPostId?: ObjectId;
  relatedCommentId?: ObjectId;
  relatedTopicId?: ObjectId;
  read: boolean;
  createdAt: Date;
}

