/**
 * @fileOverview This file defines a Genkit flow for generating safety protocol recommendations based on past incident reports.
 *
 * generateSafetyProtocolRecommendations - A function that analyzes incident reports and provides recommendations for improving safety protocols.
 * GenerateSafetyProtocolRecommendationsInput - The input type for the generateSafetyProtocolRecommendations function.
 * GenerateSafetyProtocolRecommendationsOutput - The return type for the generateSafetyProtocolRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateSafetyProtocolRecommendationsInputSchema = z.object({
  incidentReports: z
    .string()
    .describe(
      'A comprehensive summary of past incident reports, including details about the incidents, contributing factors, and any immediate actions taken.'
    ),
});
export type GenerateSafetyProtocolRecommendationsInput = z.infer<
  typeof GenerateSafetyProtocolRecommendationsInputSchema
>;

export const GenerateSafetyProtocolRecommendationsOutputSchema = z.object({
  recommendations: z
    .string()
    .describe(
      'A detailed list of recommended improvements to the safety protocols, addressing the identified weaknesses and aiming to prevent similar incidents in the future.'
    ),
});
export type GenerateSafetyProtocolRecommendationsOutput = z.infer<
  typeof GenerateSafetyProtocolRecommendationsOutputSchema
>;

export async function generateSafetyProtocolRecommendations(
  input: GenerateSafetyProtocolRecommendationsInput
): Promise<GenerateSafetyProtocolRecommendationsOutput> {
  return generateSafetyProtocolRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSafetyProtocolRecommendationsPrompt',
  input: {schema: GenerateSafetyProtocolRecommendationsInputSchema},
  output: {schema: GenerateSafetyProtocolRecommendationsOutputSchema},
  prompt: `You are a safety expert responsible for analyzing incident reports and generating recommendations for improving safety protocols to prevent future incidents.

  Analyze the following incident reports and provide specific, actionable recommendations for improving safety protocols.

  Incident Reports:
  {{incidentReports}}

  Recommendations:
  `, // Added prompt content
});

const generateSafetyProtocolRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateSafetyProtocolRecommendationsFlow',
    inputSchema: GenerateSafetyProtocolRecommendationsInputSchema,
    outputSchema: GenerateSafetyProtocolRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
