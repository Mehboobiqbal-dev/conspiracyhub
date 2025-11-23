// Static imports for all translation files to avoid Turbopack HMR issues
import enMessages from '../../../messages/en.json';
import esMessages from '../../../messages/es.json';
import frMessages from '../../../messages/fr.json';
import deMessages from '../../../messages/de.json';
import itMessages from '../../../messages/it.json';
import ptMessages from '../../../messages/pt.json';
import ruMessages from '../../../messages/ru.json';
import zhMessages from '../../../messages/zh.json';
import jaMessages from '../../../messages/ja.json';
import arMessages from '../../../messages/ar.json';
import hiMessages from '../../../messages/hi.json';
import koMessages from '../../../messages/ko.json';
import { type Locale } from '@/i18n/config';

export const messages: Record<Locale, any> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  it: itMessages,
  pt: ptMessages,
  ru: ruMessages,
  zh: zhMessages,
  ja: jaMessages,
  ar: arMessages,
  hi: hiMessages,
  ko: koMessages,
};

export function getMessages(locale: Locale) {
  return messages[locale] || messages.en;
}

