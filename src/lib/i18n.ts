import { locales, defaultLocale, type Locale } from '@/i18n/config';

let currentLocale: Locale = defaultLocale;

// Load translations synchronously (for server-side)
export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored && locales.includes(stored)) {
      return stored;
    }
  }
  return defaultLocale;
}

// Get translations for a locale
export async function getTranslations(locale: Locale) {
  try {
    const messages = await import(`../../messages/${locale}.json`);
    return messages.default;
  } catch {
    // Fallback to default locale
    const messages = await import(`../../messages/${defaultLocale}.json`);
    return messages.default;
  }
}

// Client-side translation function
export function t(key: string, locale: Locale = getLocale()): string {
  // This is a simplified version - in production, you'd want to load messages
  // For now, we'll use a client-side approach with next-intl
  return key;
}

