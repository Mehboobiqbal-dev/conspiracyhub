import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { UserFollow } from '@/lib/models/user-follow';
import { User } from '@/lib/models/user';
import { ObjectId } from 'mongodb';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFollowButton } from '@/components/user-follow-button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Following - User Profile | Elch`,
  };
}

async function getFollowing(userId: string) {
  try {
    const followsCollection = await getCollection<UserFollow>('user_follows');
    const usersCollection = await getCollection<User>('users');

    const follows = await followsCollection
      .find({ followerId: new ObjectId(userId) })
      .toArray();

    const followingIds = follows.map(f => f.followingId);
    const users = await usersCollection
      .find({ _id: { $in: followingIds } })
      .toArray();

    return users.map(user => ({
      _id: user._id?.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }));
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}

export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const following = await getFollowing(id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-headline font-bold mb-6">Following</h1>
        {following.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Not following anyone yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {following.map((user) => (
              <Card key={user._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/u/${user._id}`} className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </Link>
                    <UserFollowButton userId={user._id!} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

