'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, register } from '@/lib/auth/client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: setAuthSession } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await login(email, password);
      } else {
        response = await register(name, email, password);
      }

      setAuthSession({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      toast({
        title: 'Success',
        description: isLogin ? 'Logged in successfully!' : 'Account created successfully!',
      });
      const redirectPath = searchParams.get('redirect');
      const safeRedirect =
        redirectPath && redirectPath.startsWith('/') ? redirectPath : '/feed';
      router.push(safeRedirect);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo className="size-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Enter your email and password to sign in'
              : 'Enter your information to create an account'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={isLogin ? undefined : 8}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

