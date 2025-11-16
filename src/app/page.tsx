import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageCircle, Eye, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PostFeed } from '@/components/post-feed';

export const metadata: Metadata = {
  title: 'ConspiracyHub - Latest Conspiracy Theories & Opinions',
  description: 'Explore conspiracy theories and opinions on current and historical topics. AI-generated and user-submitted content.',
  openGraph: {
    title: 'ConspiracyHub',
    description: 'Explore conspiracy theories and opinions on current and historical topics.',
    type: 'website',
  },
};

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-headline font-bold mb-2">
                ConspiracyHub
              </h1>
              <p className="text-muted-foreground text-lg">
                Explore theories and opinions on current and historical topics
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/trending">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trending
                </Link>
              </Button>
              <Button asChild>
                <Link href="/create">Create Post</Link>
              </Button>
            </div>
          </div>
        </div>

        <PostFeed />
      </div>
    </div>
  );
}
