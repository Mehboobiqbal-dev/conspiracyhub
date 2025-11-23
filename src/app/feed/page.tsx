import { Metadata } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { PostFeed } from '@/components/post-feed';
import { FeedHeader } from '@/components/feed-header';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Your Feed - ConspiracyHub',
  description: 'Personalized feed based on your followed topics and users',
  openGraph: {
    title: 'Your Feed - ConspiracyHub',
    description: 'Personalized feed based on your followed topics and users',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

async function checkAuth() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    const payload = verifyAccessToken(accessToken);
    return payload.userId;
  } catch {
    return null;
  }
}

export default async function FeedPage() {
  const userId = await checkAuth();

  if (!userId) {
    redirect('/login?redirect=/feed');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <FeedHeader />
        <PostFeed feedType="personalized" />
      </div>
    </div>
  );
}

