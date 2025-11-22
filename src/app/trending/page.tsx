import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, MessageCircle, Eye, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTextPreview } from '@/lib/utils/html';

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-headline font-bold">Trending</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Most popular posts in the last 7 days
          </p>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No trending posts yet.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post, index) => (
              <Card key={post._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-primary">
                          #{index + 1} Trending
                        </Badge>
                        <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'}>
                          {post.type}
                        </Badge>
                        {post.isAIGenerated && (
                          <Badge variant="secondary">AI Generated</Badge>
                        )}
                        {post.topicSlug && (
                          <Link href={`/t/${post.topicSlug}`}>
                            <Badge variant="outline">{post.topicSlug}</Badge>
                          </Link>
                        )}
                      </div>
                      <Link href={`/p/${post.slug}`}>
                        <CardTitle className="text-2xl hover:text-primary transition-colors cursor-pointer">
                          {post.title}
                        </CardTitle>
                      </Link>
                      {(post.excerpt || post.content) && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {getTextPreview(post.excerpt || post.content || '', 200)}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-4 w-4" />
                      <span>{post.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.commentCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    {post.authorName && (
                      <span>by {post.authorName}</span>
                    )}
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

