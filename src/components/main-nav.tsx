'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, User, LogOut, Settings, TrendingUp, Bookmark, FileText, Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { DraftsTray } from './drafts-tray';
import { FollowSuggestionsTray } from './follow-suggestions-tray';
import { cn } from '@/lib/utils';

export function MainNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const quickLinks = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Feed', href: '/feed', authOnly: true },
      { label: 'Trending', href: '/trending' },
      { label: 'Topics', href: '/topics' },
      { label: 'Search', href: '/search' },
      { label: 'Saved', href: '/saved', authOnly: true },
      { label: 'Drafts', href: '/drafts', authOnly: true },
      { label: 'Notifications', href: '/notifications', authOnly: true },
    ],
    []
  );

  const visibleLinks = quickLinks.filter((link) => !link.authOnly || user);

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
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navigate ConspiracyHub</SheetTitle>
                  <SheetDescription>Jump to feeds, drafts, notifications, and topics.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-2">
                    {visibleLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                          pathname === link.href ? 'bg-muted text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  {user ? (
                    <Button asChild>
                      <Link href="/create" onClick={() => setMobileNavOpen(false)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create post
                      </Link>
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button asChild variant="ghost" className="flex-1" onClick={() => setMobileNavOpen(false)}>
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button asChild className="flex-1" onClick={() => setMobileNavOpen(false)}>
                        <Link href="/login">Sign up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <span className="font-headline text-xl font-bold flex items-center gap-2">
                <img src="/favicon-16x16.png" alt="ConspiracyHub Logo" width={24} height={24} className="inline-block" />
                ConspiracyHub
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-4">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.label === 'Trending' ? (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Trending
                    </span>
                  ) : (
                    link.label
                  )}
                </Link>
              ))}
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
                <DraftsTray />
                {user && <FollowSuggestionsTray />}
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

