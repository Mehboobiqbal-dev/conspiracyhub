'use client';

import { useTranslations } from 'next-intl';

export function FeedHeader() {
  const t = useTranslations('feed');

  return (
    <>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold mb-3 sm:mb-4">{t('yourFeed')}</h1>
      <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
        {t('feedDescription')}
      </p>
    </>
  );
}


