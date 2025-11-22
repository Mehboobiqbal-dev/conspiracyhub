'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadMedia } from '@/lib/uploads/client';
import { authenticatedFetch } from '@/lib/auth/fetch';

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/settings');
      return;
    }
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: name.trim(),
          bio: bio.trim(), // Ensure bio is sent even if empty
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      await refreshUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerAvatarPicker = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const result = await uploadMedia(file, 'image');
      setAvatar(result.url);

      const response = await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: result.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      toast({
        title: 'Avatar updated',
        description: 'Your profile photo has been refreshed.',
      });
      await refreshUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload avatar';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarRemove = async () => {
    if (!avatar) return;
    setAvatarUploading(true);
    try {
      const response = await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar: '' }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

      setAvatar('');
      toast({
        title: 'Avatar removed',
        description: 'Your profile photo was cleared.',
      });
      await refreshUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove avatar';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-headline font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>Use signed uploads for fast, secure avatar updates.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                {avatar ? (
                  <AvatarImage src={avatar} alt={user.name} />
                ) : (
                  <AvatarFallback className="text-2xl">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-3 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={triggerAvatarPicker}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAvatarRemove}
                    disabled={!avatar || avatarUploading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or WEBP up to 5MB. Images are routed through the new signed upload
                  pipeline you also use when composing posts or comments.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your public details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

