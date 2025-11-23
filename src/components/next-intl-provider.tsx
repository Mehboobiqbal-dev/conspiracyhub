'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '@/contexts/locale-context';
import { ReactNode, useMemo } from 'react';
import { getMessages } from '@/lib/i18n/messages';

// Get user's timezone or default to UTC
function getUserTimeZone(): string {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
}

export function NextIntlProviderWrapper({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const messages = useMemo(() => getMessages(locale), [locale]);
  const timeZone = useMemo(() => getUserTimeZone(), []);

  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={messages}
      timeZone={timeZone}
      now={new Date()}
    >
      {children}
    </NextIntlClientProvider>
  );
}

