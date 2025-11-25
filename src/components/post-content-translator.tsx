'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface PostContentTranslatorProps {
  content: string;
  targetLanguage?: string;
  className?: string;
}

export function PostContentTranslator({ 
  content, 
  targetLanguage,
  className = '' 
}: PostContentTranslatorProps) {
  const t = useTranslations('post');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);

  const handleTranslate = async () => {
    if (translatedContent) {
      setShowOriginal(!showOriginal);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          targetLanguage: targetLanguage || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedContent(data.translatedText);
      setShowOriginal(false);
    } catch (error) {
      console.error('Translation error:', error);
      Swal.fire({
        icon: 'error',
        title: t('translationError'),
        text: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const displayContent = showOriginal ? content : (translatedContent || content);

  return (
    <div className={className}>
      <div 
        dangerouslySetInnerHTML={{ __html: displayContent }}
        className="prose prose-sm max-w-none dark:prose-invert"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTranslate}
        disabled={isTranslating}
        className="mt-2"
      >
        {isTranslating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('translating')}
          </>
        ) : translatedContent ? (
          showOriginal ? t('showTranslation') : t('showOriginal')
        ) : (
          <>
            <Languages className="h-4 w-4 mr-2" />
            {t('translate')}
          </>
        )}
      </Button>
    </div>
  );
}



