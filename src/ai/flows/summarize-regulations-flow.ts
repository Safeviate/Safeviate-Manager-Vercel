'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a legal document and extracting compliance requirements.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RegulationSchema = z.object({
    regulationCode: z.string().describe("The official code for the regulation (e.g., '141.02.2')."),
    regulationStatement: z.string().describe("The full text of the regulation."),
    companyReference: z.string().describe("A suggested reference to an internal manual (e.g., 'Ops Manual, Sec 4.2.1'). Provide a sensible placeholder if not obvious."),
});

const SummarizeRegulationsInputSchema = z.object({
  documentContent: z.string().describe('The full text content of the aviation regulations document.'),
});
export type SummarizeRegulationsInput = z.infer<typeof SummarizeRegulationsInputSchema>;

const SummarizeRegulationsOutputSchema = z.object({
  requirements: z.array(RegulationSchema).describe('An array of structured compliance requirements extracted from the document.'),
});
export type SummarizeRegulationsOutput = z.infer<typeof SummarizeRegulationsOutputSchema>;


export async function summarizeRegulations(input: SummarizeRegulationsInput): Promise<SummarizeRegulationsOutput> {
    return summarizeRegulationsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'summarizeRegulationsPrompt',
    input: { schema: SummarizeRegulationsInputSchema },
    output: { schema: SummarizeRegulationsOutputSchema },
    prompt: `You are an expert in aviation regulatory compliance. Your task is to analyze the provided text from a regulations document and extract each individual compliance requirement.

For each requirement you identify, you must structure it into the following fields:
- regulationCode: The specific number or code of the regulation.
- regulationStatement: The complete, verbatim text of the regulation.
- companyReference: A sensible placeholder for where this might be found in a typical airline's Operations Manual.

Analyze the following document content and extract all requirements:

Document Content:
{{documentContent}}
`,
});

const summarizeRegulationsFlow = ai.defineFlow(
  {
    name: 'summarizeRegulationsFlow',
    inputSchema: SummarizeRegulationsInputSchema,
    outputSchema: SummarizeRegulationsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
