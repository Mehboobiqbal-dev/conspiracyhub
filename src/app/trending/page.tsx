import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { TrendingContent } from '@/components/trending-content';

export const metadata: Metadata = {
  title: 'Trending Posts | ConspiracyHub',
  description: 'Most popular and trending conspiracy theories and opinions',
};

async function getTrendingPosts() {
  try {
    const postsCollection = await getCollection<Post>('posts');
    
    // Get posts from last 7 days with high engagement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await postsCollection
      .find({
        status: 'published',
        createdAt: { $gte: sevenDaysAgo },
      })
      .sort({
        // Trending algorithm: weight recent posts with high engagement
        upvotes: -1,
        commentCount: -1,
        views: -1,
      })
      .limit(50)
      .toArray();

    // Calculate trending score
    const postsWithScore = posts.map(post => {
      const hoursSinceCreation = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
      const trendingScore = 
        (post.upvotes * 2) + 
        (post.commentCount * 3) + 
        (post.views * 0.1) - 
        (hoursSinceCreation * 0.5);
      
      return { ...post, trendingScore };
    });

    // Sort by trending score
    postsWithScore.sort((a, b) => b.trendingScore - a.trendingScore);

    return postsWithScore.slice(0, 30).map(post => ({
      ...post,
      _id: post._id?.toString(),
      topicId: post.topicId?.toString(),
      authorId: post.authorId?.toString(),
    }));
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return [];
  }
}

export default async function TrendingPage() {
  const posts = await getTrendingPosts();

  return <TrendingContent posts={posts} />;
}

