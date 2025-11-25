import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { NotificationsList } from '@/components/notifications-list';

export const metadata: Metadata = {
  title: 'Notifications - Elch',
  description: 'View all your notifications',
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login?redirect=/notifications');
  }

  try {
    verifyAccessToken(accessToken);
  } catch {
    redirect('/login?redirect=/notifications');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-headline font-bold mb-6">Notifications</h1>
        <NotificationsList />
      </div>
    </div>
  );
}

