'use server';

import {
  generateEchoFeedAndBustIt,
  type GenerateEchoFeedAndBustItOutput,
} from '@/ai/flows/generate-echo-feed-and-bust-it';

export async function submitOpinion(
  prevState: any,
  formData: FormData
): Promise<{ result: GenerateEchoFeedAndBustItOutput | null; error: string | null }> {
  const opinion = formData.get('opinion') as string;
  if (!opinion || opinion.length > 280) {
    return { result: null, error: 'Opinion must be between 1 and 280 characters.' };
  }

  try {
    const result = await generateEchoFeedAndBustIt({ opinion });
    return { result, error: null };
  } catch (e) {
    console.error(e);
    return { result: null, error: 'Failed to generate AI response. Please try again.' };
  }
}
