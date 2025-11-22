import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import { notifyScheduledPostPublished } from '@/lib/utils/notifications';
import { ObjectId } from 'mongodb';

/**
 * Publishes scheduled posts whose scheduled time has passed.
 * Returns the number of posts that transitioned to published.
 */
export async function publishDueScheduledPosts(limit = 20) {
  const now = new Date();
  const postsCollection = await getCollection<Post>('posts');
  const topicsCollection = await getCollection<Topic>('topics');

  const duePosts = await postsCollection
    .find({
      status: 'scheduled',
      scheduledFor: { $lte: now },
    })
    .limit(limit)
    .toArray();

  if (duePosts.length === 0) {
    return 0;
  }

  for (const post of duePosts) {
    const publishedAt = new Date();
    await postsCollection.updateOne(
      { _id: post._id },
      {
        $set: {
          status: 'published',
          publishedAt,
          updatedAt: publishedAt,
        },
        $unset: {
          scheduledFor: '',
        },
      }
    );

    if (post.topicId instanceof ObjectId) {
      await topicsCollection.updateOne(
        { _id: post.topicId },
        { $inc: { postCount: 1 } }
      );
    }

    if (post.authorId instanceof ObjectId && post._id) {
      await notifyScheduledPostPublished(
        post.authorId,
        post._id,
        post.slug,
        post.title || 'Your scheduled post'
      );
    }
  }

  return duePosts.length;
}

