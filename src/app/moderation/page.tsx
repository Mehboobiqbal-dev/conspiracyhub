import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { ModerationQueue } from '@/components/moderation-queue';

export const metadata: Metadata = {
  title: 'Moderation Queue - Elch',
  description: 'Review and moderate reported content',
};

export default async function ModerationPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login?redirect=/moderation');
  }

  let userRole = 'user';
  try {
    const payload = verifyAccessToken(accessToken);
    userRole = payload.role || 'user';
  } catch {
    redirect('/login?redirect=/moderation');
  }

  if (userRole !== 'admin' && userRole !== 'moderator') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-headline font-bold mb-6">Moderation Queue</h1>
        <ModerationQueue />
      </div>
    </div>
  );
}

