'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';

export function HomeHeader() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const tPost = useTranslations('post');

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t('explore')}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" className="flex-1 sm:flex-initial">
            <Link href="/trending">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{tPost('trending')}</span>
              <span className="sm:hidden">Trending</span>
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href="/create">
              <span className="hidden sm:inline">{t('createPost')}</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}


