'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { LanguageSelector } from './language-selector';
import { cn } from '@/lib/utils';

export function MainNav() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const quickLinks = useMemo(
    () => [
      { label: t('home'), href: '/', key: 'home' },
      { label: t('feed'), href: '/feed', authOnly: true, key: 'feed' },
      { label: t('trending'), href: '/trending', key: 'trending' },
      { label: t('topics'), href: '/topics', key: 'topics' },
      { label: t('search'), href: '/search', key: 'search' },
      { label: t('saved'), href: '/saved', authOnly: true, key: 'saved' },
      { label: t('drafts'), href: '/drafts', authOnly: true, key: 'drafts' },
      { label: t('notifications'), href: '/notifications', authOnly: true, key: 'notifications' },
    ],
    [t]
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
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>{t('navigateTitle')}</SheetTitle>
                  <SheetDescription>{t('navigateDescription')}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-2">
                    {visibleLinks.map((link) => (
                      <Link
                        key={link.key || link.href}
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
                        {t('createPost')}
                      </Link>
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button asChild variant="ghost" className="flex-1" onClick={() => setMobileNavOpen(false)}>
                        <Link href="/login">{t('login')}</Link>
                      </Button>
                      <Button asChild className="flex-1" onClick={() => setMobileNavOpen(false)}>
                        <Link href="/login">{t('signup')}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-1 sm:gap-2 shrink-0">
              <span className="font-headline text-lg sm:text-xl font-bold flex items-center gap-1 sm:gap-2">
                <img src="/favicon-16x16.png" alt="Elch Logo" width={20} height={20} className="sm:w-6 sm:h-6 inline-block" />
                <span className="hidden sm:inline">Elch</span>
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-4">
              {visibleLinks.map((link) => (
                <Link
                  key={link.key || link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.key === 'trending' ? (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {link.label}
                    </span>
                  ) : (
                    link.label
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-2 sm:mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          {/* Mobile Search Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="pt-12">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </form>
            </SheetContent>
          </Sheet>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user ? (
              <>
                <Button asChild size="sm" className="hidden sm:flex">
                  <Link href="/create">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden lg:inline">{t('create')}</span>
                  </Link>
                </Button>
                <DraftsTray />
                {user && <FollowSuggestionsTray />}
                <NotificationBell />
                <LanguageSelector />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs sm:text-sm">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
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
                      <Link href={user.id ? `/u/${user.id}` : '#'}>
                        <User className="mr-2 h-4 w-4" />
                        {t('profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved">
                        <Bookmark className="mr-2 h-4 w-4" />
                        {t('savedPosts')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/drafts">
                        <FileText className="mr-2 h-4 w-4" />
                        {t('drafts')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        {t('settings')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <LanguageSelector />
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild size="sm" className="hidden sm:flex">
                  <Link href="/login">{t('signup')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

