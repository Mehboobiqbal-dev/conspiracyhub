import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/db/mongodb';
import { Topic } from '@/lib/models/topic';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TopicFollowButton } from '@/components/topic-follow-button';
import { PostFeed } from '@/components/post-feed';

interface PageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

async function getTopicData(slug: string) {
  try {
    const topicsCollection = await getCollection<Topic>('topics');
    const topic = await topicsCollection.findOne({ slug });

    if (!topic) return null;

    return {
      topic: {
        ...topic,
        _id: topic._id?.toString(),
      },
    };
  } catch (error) {
    console.error('Error fetching topic:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTopicData(slug);
  
  if (!data) {
    return {
      title: 'Topic Not Found',
    };
  }

  const { topic } = data;
  
  return {
    title: `${topic.name} - Conspiracy & Opinion Platform`,
    description: topic.description || `Explore ${topic.name} conspiracy theories and opinions`,
    openGraph: {
      title: topic.name,
      description: topic.description || `Explore ${topic.name} conspiracy theories and opinions`,
      type: 'website',
    },
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getTopicData(slug);

  if (!data) {
    notFound();
  }

  const { topic } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: topic.name,
    description: topic.description || `Explore ${topic.name} conspiracy theories and opinions`,
    url: `${baseUrl}/t/${topic.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      name: `${topic.name} Posts`,
      numberOfItems: topic.postCount || 0,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          {' / '}
          <Link href="/topics" className="hover:text-foreground">Topics</Link>
          {' / '}
          <span className="text-foreground">{topic.name}</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-headline font-bold mb-2">{topic.name}</h1>
              {topic.description && (
                <p className="text-muted-foreground text-lg">{topic.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{topic.postCount || 0} posts</span>
                <span>{topic.followerCount || 0} followers</span>
              </div>
            </div>
            <TopicFollowButton topicSlug={topic.slug} initialFollowerCount={topic.followerCount || 0} />
          </div>
        </div>

        <PostFeed feedType="public" topicSlug={slug} />
      </div>
    </div>
  );
}
