'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '@/contexts/locale-context';
import { ReactNode, useEffect, useState } from 'react';
import enMessages from '../../messages/en.json';

// Get user's timezone or default to UTC
function getUserTimeZone(): string {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
}

export function NextIntlProviderWrapper({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [messages, setMessages] = useState<Record<string, any>>(enMessages);
  const [timeZone] = useState<string>(() => getUserTimeZone());

  useEffect(() => {
    // Dynamically load translations
    const loadMessages = async () => {
      try {
        const mod = await import(`../../messages/${locale}.json`);
        setMessages(mod.default);
      } catch (error) {
        console.error(`Failed to load messages for locale ${locale}, falling back to English`, error);
        setMessages(enMessages);
      }
    };
    
    if (locale !== 'en') {
      loadMessages();
    } else {
      setMessages(enMessages);
    }
  }, [locale]);

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

