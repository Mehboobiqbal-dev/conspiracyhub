'use server';
/**
 * @fileOverview Moderates real-time debates, detects fallacies using NLP, and provides scoring.
 *
 * - moderateRealTimeDebate - A function that moderates real-time debates.
 * - ModerateRealTimeDebateInput - The input type for the moderateRealTimeDebate function.
 * - ModerateRealTimeDebateOutput - The return type for the moderateRealTimeDebate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateRealTimeDebateInputSchema = z.object({
  statement: z.string().describe('The statement made by a participant in the debate.'),
  context: z.string().describe('The current context of the debate.'),
  rules: z.string().describe('The rules of the debate.'),
});
export type ModerateRealTimeDebateInput = z.infer<typeof ModerateRealTimeDebateInputSchema>;

const ModerateRealTimeDebateOutputSchema = z.object({
  isFallacy: z.boolean().describe('Whether the statement contains a fallacy.'),
  fallacyType: z.string().describe('The type of fallacy, if any.'),
  score: z.number().describe('The score for the statement based on its validity and relevance.'),
  explanation: z.string().describe('Explanation of the score and fallacy detection.'),
});
export type ModerateRealTimeDebateOutput = z.infer<typeof ModerateRealTimeDebateOutputSchema>;

export async function moderateRealTimeDebate(input: ModerateRealTimeDebateInput): Promise<ModerateRealTimeDebateOutput> {
  return moderateRealTimeDebateFlow(input);
}

const detectFallacyTool = ai.defineTool({
  name: 'detectFallacy',
  description: 'Detects if a given statement contains a logical fallacy based on the context and rules of the debate.',
  inputSchema: z.object({
    statement: z.string().describe('The statement to analyze.'),
    context: z.string().describe('The current context of the debate.'),
    rules: z.string().describe('The rules of the debate.'),
  }),
  outputSchema: z.object({
    isFallacy: z.boolean().describe('Whether the statement contains a fallacy.'),
    fallacyType: z.string().describe('The type of fallacy, if any. If there is no fallacy return N/A.'),
    explanation: z.string().describe('The explanation of why the statement is or is not a fallacy.'),
  }),
}, async (input) => {
  // Basic placeholder implementation, replace with actual NLP-based fallacy detection
  const {statement, context, rules} = input;
  let isFallacy = false;
  let fallacyType = 'N/A';
  let explanation = 'No fallacy detected.';

  // Example: Check for ad hominem fallacy (very basic check)
  if (statement.toLowerCase().includes('you are wrong because you are')) {
    isFallacy = true;
    fallacyType = 'Ad Hominem';
    explanation = 'The statement attacks the person making the argument rather than the argument itself.';
  }

  return {
    isFallacy,
    fallacyType,
    explanation,
  };
});

const scoreStatementTool = ai.defineTool({
  name: 'scoreStatement',
  description: 'Scores a statement based on its validity, relevance to the context, and adherence to the debate rules.',
  inputSchema: z.object({
    statement: z.string().describe('The statement to score.'),
    context: z.string().describe('The current context of the debate.'),
    rules: z.string().describe('The rules of the debate.'),
    isFallacy: z.boolean().describe('Whether the statement contains a fallacy.'),
  }),
  outputSchema: z.number().describe('The score for the statement. Higher score indicates a better statement.'),
}, async (input) => {
  // Placeholder implementation, replace with actual scoring logic
  const {statement, context, rules, isFallacy} = input;
  let score = 5;

  if (isFallacy) {
    score -= 3;
  }

  if (!statement.toLowerCase().includes(context.toLowerCase())) {
    score -= 1;
  }

  // Ensure score is within a reasonable range
  score = Math.max(0, Math.min(10, score));

  return score;
});

const prompt = ai.definePrompt({
  name: 'moderateRealTimeDebatePrompt',
  tools: [detectFallacyTool, scoreStatementTool],
  input: {schema: ModerateRealTimeDebateInputSchema},
  output: {schema: ModerateRealTimeDebateOutputSchema},
  prompt: `You are an AI debate moderator. Your job is to analyze statements made in a debate,
determine if they contain logical fallacies, and score them based on their validity and relevance.

Context: {{{context}}}
Rules: {{{rules}}}
Statement: {{{statement}}}

First, use the detectFallacy tool to check if the statement contains any logical fallacies.
Then, use the scoreStatement tool to score the statement based on its validity and relevance to the context and rules. The score should reflect the quality of the statement.

Output a JSON object containing the isFallacy, fallacyType, score, and explanation fields.
`,
});

const moderateRealTimeDebateFlow = ai.defineFlow(
  {
    name: 'moderateRealTimeDebateFlow',
    inputSchema: ModerateRealTimeDebateInputSchema,
    outputSchema: ModerateRealTimeDebateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
export const moderateRealTimeDebates = moderateRealTimeDebateFlow;
