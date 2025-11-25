import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export const metadata: Metadata = {
  title: 'Community Analytics - Elch',
  description: 'View community statistics and insights',
};

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login?redirect=/analytics');
  }

  let userRole = 'user';
  try {
    const payload = verifyAccessToken(accessToken);
    userRole = payload.role || 'user';
  } catch {
    redirect('/login?redirect=/analytics');
  }

  if (userRole !== 'admin' && userRole !== 'moderator') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-headline font-bold mb-6">Community Analytics</h1>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

