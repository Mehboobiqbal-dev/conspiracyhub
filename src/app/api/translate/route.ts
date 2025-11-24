import { NextRequest, NextResponse } from 'next/server';

// Free translation API using LibreTranslate
// You can also use Google Translate API, DeepL, or other services
const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';

export async function POST(request: NextRequest) {
  let body: any;
  let originalText = '';

  try {
    body = await request.json();
    const { text, source, target, targetLanguage } = body;
    originalText = text || '';

    // Support both old format (source/target) and new format (targetLanguage)
    const targetLang = target || targetLanguage || 'en';
    const sourceLang = source || 'auto'; // Auto-detect source language

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required parameters: text and targetLanguage are required' },
        { status: 400 }
      );
    }

    // If source and target are the same, return original text
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      return NextResponse.json({ translatedText: text });
    }

    // Map locale codes to LibreTranslate language codes
    const languageMap: Record<string, string> = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ru': 'ru',
      'zh': 'zh',
      'ja': 'ja',
      'ar': 'ar',
      'hi': 'hi',
      'ko': 'ko',
    };

    const targetCode = languageMap[targetLang] || 'en';
    const sourceCode = sourceLang === 'auto' ? 'auto' : (languageMap[sourceLang] || 'auto');

    // Use LibreTranslate API (free, no API key required)
    const response = await fetch(LIBRETRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceCode,
        target: targetCode,
        format: 'html', // Preserve HTML formatting
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LibreTranslate API error:', response.status, errorText);
      throw new Error(`Translation service unavailable: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ translatedText: data.translatedText || text });
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback: Return original text if translation fails
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Translation service unavailable',
        translatedText: originalText // Return original as fallback
      },
      { status: 500 }
    );
  }
}


