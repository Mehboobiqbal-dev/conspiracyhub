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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-lg">
            {t('explore')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/trending">
              <TrendingUp className="h-4 w-4 mr-1" />
              {tPost('trending')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/create">{t('createPost')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}


