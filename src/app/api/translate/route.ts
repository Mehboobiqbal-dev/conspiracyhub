import { NextRequest, NextResponse } from 'next/server';

// Free translation API using LibreTranslate
// You can also use Google Translate API, DeepL, or other services
const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';

export async function POST(request: NextRequest) {
  try {
    const { text, source, target } = await request.json();

    if (!text || !source || !target) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // If source and target are the same, return original text
    if (source === target) {
      return NextResponse.json({ translatedText: text });
    }

    // Use LibreTranslate API (free, no API key required)
    const response = await fetch(LIBRETRANSLATE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: 'html', // Preserve HTML formatting
      }),
    });

    if (!response.ok) {
      // Fallback: Try Google Translate API (requires API key in env)
      // Or return error
      throw new Error('Translation service unavailable');
    }

    const data = await response.json();
    return NextResponse.json({ translatedText: data.translatedText || text });
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback: Return original text if translation fails
    const { text } = await request.json();
    return NextResponse.json(
      { 
        error: 'Translation service unavailable',
        translatedText: text // Return original as fallback
      },
      { status: 500 }
    );
  }
}


