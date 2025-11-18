'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, User, LogOut, Settings, Home, TrendingUp, Bookmark, FileText } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MainNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-headline text-xl font-bold">ConspiracyHub</span>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                Home
              </Link>
              {user && (
                <Link href="/feed" className="text-sm font-medium hover:text-primary transition-colors">
                  Feed
                </Link>
              )}
              <Link href="/topics" className="text-sm font-medium hover:text-primary transition-colors">
                Topics
              </Link>
              <Link href="/trending" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Trending
              </Link>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search posts, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button asChild size="sm" className="hidden sm:flex">
                  <Link href="/create">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Link>
                </Button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/u/${user.id}`}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved">
                        <Bookmark className="mr-2 h-4 w-4" />
                        Saved Posts
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/drafts">
                        <FileText className="mr-2 h-4 w-4" />
                        Drafts
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/login">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

