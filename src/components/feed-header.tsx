'use client';

import { useTranslations } from 'next-intl';

export function FeedHeader() {
  const t = useTranslations('feed');

  return (
    <>
      <h1 className="text-4xl font-headline font-bold mb-4">{t('yourFeed')}</h1>
      <p className="text-muted-foreground mb-6">
        {t('feedDescription')}
      </p>
    </>
  );
}


