'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Loader2 } from 'lucide-react';
import { useLocale } from '@/contexts/locale-context';
import { useTranslations } from 'next-intl';

interface PostTranslatorProps {
  content: string;
  originalLanguage?: string;
}

// Map our locale codes to language codes for translation API
const localeToLanguageCode: Record<string, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  zh: 'zh',
  ja: 'ja',
  ar: 'ar',
  hi: 'hi',
  ko: 'ko',
};

export function PostTranslator({ content, originalLanguage = 'en' }: PostTranslatorProps) {
  const { locale } = useLocale();
  const t = useTranslations('post');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [contentElement, setContentElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the post content element
    const element = document.getElementById('post-content');
    setContentElement(element);
  }, []);

  const targetLanguage = localeToLanguageCode[locale] || 'en';

  // Don't show translate button if already in the target language
  if (originalLanguage === targetLanguage) {
    return null;
  }

  const translateContent = async () => {
    setIsTranslating(true);
    setError(null);

    try {
      // Use LibreTranslate API (free and open-source)
      // Alternative: You can use Google Translate API or other services
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          source: originalLanguage,
          target: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedContent(data.translatedText);
      setShowOriginal(false);
      
      // Update the content element with translated text
      if (contentElement && data.translatedText) {
        contentElement.innerHTML = data.translatedText;
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(t('translationError'));
      // Fallback: Use browser's built-in translation
      // This will trigger browser's translate feature
      if (typeof window !== 'undefined' && (window as any).google?.translate) {
        (window as any).google.translate.TranslateElement({
          pageLanguage: originalLanguage,
          includedLanguages: targetLanguage,
        }, 'google_translate_element');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={translateContent}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('translating')}
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              {t('translateTo')} {localeToLanguageCode[locale]?.toUpperCase() || 'English'}
            </>
          )}
        </Button>
        {translatedContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowOriginal(!showOriginal);
              if (contentElement) {
                contentElement.innerHTML = showOriginal ? translatedContent : content;
              }
            }}
          >
            {showOriginal ? t('showTranslation') : t('showOriginal')}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}
    </div>
  );
}

