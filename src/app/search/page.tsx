import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, MessageCircle, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SearchType = 'all' | 'posts' | 'topics';

interface SearchPageProps {
  searchParams: {
    q?: string;
    type?: SearchType;
    postType?: 'conspiracy' | 'opinion';
    aiOnly?: string;
    topic?: string;
    sort?: 'relevance' | 'newest' | 'oldest' | 'top' | 'trending';
    timeRange?: 'all' | '24h' | '7d' | '30d' | '1y';
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q || '';
  return {
    title: query ? `Search: ${query} | ConspiracyHub` : 'Search | ConspiracyHub',
    description: `Search results for "${query}"`,
  };
}

interface PostFilters {
  postType?: 'conspiracy' | 'opinion';
  aiOnly?: boolean;
  topicSlug?: string;
  sort?: 'relevance' | 'newest' | 'oldest' | 'top' | 'trending';
  timeRange?: 'all' | '24h' | '7d' | '30d' | '1y';
}

async function searchPosts(query: string, filters: PostFilters) {
  try {
    const postsCollection = await getCollection<Post>('posts');
    const postQuery: any = {
      status: 'published',
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    };

    if (filters.postType) {
      postQuery.type = filters.postType;
    }

    if (filters.aiOnly) {
      postQuery.isAIGenerated = true;
    }

    if (filters.topicSlug) {
      postQuery.topicSlug = filters.topicSlug;
    }

    if (filters.timeRange && filters.timeRange !== 'all') {
      const date = new Date();
      switch (filters.timeRange) {
        case '24h':
          date.setHours(date.getHours() - 24);
          break;
        case '7d':
          date.setDate(date.getDate() - 7);
          break;
        case '30d':
          date.setDate(date.getDate() - 30);
          break;
        case '1y':
          date.setFullYear(date.getFullYear() - 1);
          break;
      }
      postQuery.createdAt = { $gte: date };
    }

    let sort: any = { createdAt: -1 };
    switch (filters.sort) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'top':
        sort = { upvotes: -1, createdAt: -1 };
        break;
      case 'trending':
        sort = { upvotes: -1, commentCount: -1, createdAt: -1 };
        break;
      case 'relevance':
      default:
        sort = { createdAt: -1 };
    }

    const posts = await postsCollection
      .find(postQuery)
      .sort(sort)
      .limit(50)
      .toArray();

    return posts.map(post => ({
      ...post,
      _id: post._id?.toString(),
      topicId: post.topicId?.toString(),
      authorId: post.authorId?.toString(),
    }));
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
}

async function searchTopics(query: string) {
  try {
    const topicsCollection = await getCollection<Topic>('topics');
    
    const topics = await topicsCollection
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(10)
      .toArray();

    return topics.map(topic => ({
      ...topic,
      _id: topic._id?.toString(),
    }));
  } catch (error) {
    console.error('Error searching topics:', error);
    return [];
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const typeFilter = (searchParams.type as SearchType) || 'all';
  const postType = searchParams.postType;
  const aiOnly = searchParams.aiOnly === 'true';
  const topicSlug = searchParams.topic || '';
  const sort = searchParams.sort as 'relevance' | 'newest' | 'oldest' | 'top' | 'trending' || 'relevance';
  const timeRange = searchParams.timeRange as 'all' | '24h' | '7d' | '30d' | '1y' || 'all';
  const resetHref = `/search?q=${encodeURIComponent(query)}`;

  const posts =
    query && (typeFilter === 'all' || typeFilter === 'posts')
      ? await searchPosts(query, { postType, aiOnly, topicSlug, sort, timeRange })
      : [];
  const topics =
    query && (typeFilter === 'all' || typeFilter === 'topics')
      ? await searchTopics(query)
      : [];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';

  // Structured data for search results
  const structuredData = query ? {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: `Search Results for "${query}"`,
    url: `${baseUrl}/search?q=${encodeURIComponent(query)}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length + topics.length,
      itemListElement: [
        ...posts.slice(0, 10).map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            headline: post.title,
            url: `${baseUrl}/p/${post.slug}`,
          },
        })),
        ...topics.slice(0, 10).map((topic, index) => ({
          '@type': 'ListItem',
          position: posts.length + index + 1,
          item: {
            '@type': 'Thing',
            name: topic.name,
            url: `${baseUrl}/t/${topic.slug}`,
          },
        })),
      ],
    },
  } : null;

  return (
    <div className="min-h-screen bg-background">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold mb-2">
            {query ? `Search Results for "${query}"` : 'Search'}
          </h1>
          {!query && (
            <p className="text-muted-foreground">Enter a search query to find posts and topics</p>
          )}
        </div>

        {query && (
          <>
            <Card className="mb-8">
              <CardContent className="pt-6">
                <form method="get" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="q" value={query} />
                  <div>
                    <Label className="text-sm font-medium">Post Type</Label>
                    <Select name="postType" defaultValue={postType || 'all'}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="conspiracy">Conspiracy</SelectItem>
                        <SelectItem value="opinion">Opinion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time Range</Label>
                    <Select name="timeRange" defaultValue={timeRange}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any time</SelectItem>
                        <SelectItem value="24h">Past 24 hours</SelectItem>
                        <SelectItem value="7d">Past week</SelectItem>
                        <SelectItem value="30d">Past month</SelectItem>
                        <SelectItem value="1y">Past year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sort</Label>
                    <Select name="sort" defaultValue={sort}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="trending">Trending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <Label className="text-sm font-medium">Filters</Label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="aiOnly" value="true" defaultChecked={aiOnly} />
                        AI only
                      </label>
                      <Input
                        name="topic"
                        placeholder="Topic slug"
                        defaultValue={topicSlug}
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Apply Filters
                      </Button>
                      <Button type="button" variant="outline" className="flex-1" asChild>
                        <Link href={resetHref}>Reset</Link>
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {topics.length > 0 && (typeFilter === 'all' || typeFilter === 'topics') && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map((topic) => (
                    <Link key={topic._id} href={`/t/${topic.slug}`}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle>{topic.name}</CardTitle>
                          {topic.description && (
                            <CardDescription className="line-clamp-2">
                              {topic.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <Badge variant="outline">{topic.postCount} posts</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-4">Posts ({posts.length})</h2>
              {posts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No posts found matching your search.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post._id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
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
                            {post.excerpt && (
                              <CardDescription className="mt-2 line-clamp-2">
                                {post.excerpt}
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

