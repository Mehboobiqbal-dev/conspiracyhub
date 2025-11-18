'use server';

/**
 * @fileOverview Generates predictive simulations for opinions sealed in time capsules.
 *
 * - generatePredictiveSimulations - A function that generates simulations about the future relevance of an opinion.
 * - GeneratePredictiveSimulationsInput - The input type for the generatePredictiveSimulations function.
 * - GeneratePredictiveSimulationsOutput - The return type for the generatePredictiveSimulations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GeneratePredictiveSimulationsInputSchema = z.object({
  opinion: z
    .string()
    .describe('The opinion that the user has sealed in the time capsule.'),
  unlockDate: z
    .string()
    .describe(
      'The date when the time capsule will be unlocked, in ISO 8601 format (YYYY-MM-DD).'
    ),
});
export type GeneratePredictiveSimulationsInput = z.infer<
  typeof GeneratePredictiveSimulationsInputSchema
>;

const GeneratePredictiveSimulationsOutputSchema = z.object({
  simulation: z
    .string()
    .describe(
      'A predictive simulation of how the opinion might be viewed in the future, considering the unlock date.'
    ),
});
export type GeneratePredictiveSimulationsOutput = z.infer<
  typeof GeneratePredictiveSimulationsOutputSchema
>;

export async function generatePredictiveSimulations(
  input: GeneratePredictiveSimulationsInput
): Promise<GeneratePredictiveSimulationsOutput> {
  return generatePredictiveSimulationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePredictiveSimulationsPrompt',
  input: {schema: GeneratePredictiveSimulationsInputSchema},
  output: {schema: GeneratePredictiveSimulationsOutputSchema},
  prompt: `You are a time-traveling futurist. A user has sealed the following opinion in a time capsule, to be opened on {{unlockDate}}. Generate a predictive simulation of how this opinion might be viewed in the future. Consider how societal norms, technology, and other factors might evolve between now and then.\n\nOpinion: {{{opinion}}}`,
});

const generatePredictiveSimulationsFlow = ai.defineFlow(
  {
    name: 'generatePredictiveSimulationsFlow',
    inputSchema: GeneratePredictiveSimulationsInputSchema,
    outputSchema: GeneratePredictiveSimulationsOutputSchema,
  },
  async (input: GeneratePredictiveSimulationsInput) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export const generatePredictiveSimulationsForTimeCapsules =
  generatePredictiveSimulationsFlow;
