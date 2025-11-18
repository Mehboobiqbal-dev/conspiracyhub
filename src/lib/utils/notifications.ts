import { getCollection } from '@/lib/db/mongodb';
import { Notification } from '@/lib/models/notification';
import { ObjectId } from 'mongodb';

export async function createNotification(notification: Omit<Notification, '_id' | 'createdAt' | 'read'>) {
  try {
    const notificationsCollection = await getCollection<Notification>('notifications');
    await notificationsCollection.insertOne({
      ...notification,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function notifyCommentReply(commentAuthorId: string, replyAuthorId: string, postId: string, commentId: string, postTitle: string) {
  await createNotification({
    userId: new ObjectId(commentAuthorId),
    type: 'comment_reply',
    title: 'New Reply to Your Comment',
    message: `Someone replied to your comment on "${postTitle}"`,
    link: `/p/${postId}#comment-${commentId}`,
    relatedUserId: new ObjectId(replyAuthorId),
    relatedPostId: new ObjectId(postId),
    relatedCommentId: new ObjectId(commentId),
  });
}

export async function notifyPostReply(postAuthorId: string, commentAuthorId: string, postId: string, postTitle: string) {
  await createNotification({
    userId: new ObjectId(postAuthorId),
    type: 'post_reply',
    title: 'New Comment on Your Post',
    message: `Someone commented on your post "${postTitle}"`,
    link: `/p/${postId}`,
    relatedUserId: new ObjectId(commentAuthorId),
    relatedPostId: new ObjectId(postId),
  });
}

export async function notifyVote(postAuthorId: string, voterId: string, postId: string, type: 'upvote' | 'downvote', postTitle: string) {
  await createNotification({
    userId: new ObjectId(postAuthorId),
    type: type === 'upvote' ? 'vote_up' : 'vote_down',
    title: type === 'upvote' ? 'New Upvote' : 'New Downvote',
    message: `Your post "${postTitle}" received a ${type}`,
    link: `/p/${postId}`,
    relatedUserId: new ObjectId(voterId),
    relatedPostId: new ObjectId(postId),
  });
}

