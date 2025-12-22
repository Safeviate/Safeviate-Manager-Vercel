'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a document (text or image) and extracting compliance requirements.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RegulationSchema = z.object({
    regulationCode: z.string().describe("The official code for the regulation (e.g., '141.02.2')."),
    regulationStatement: z.string().describe("The full text of the regulation."),
    companyReference: z.string().describe("A suggested reference to an internal manual (e.g., 'Ops Manual, Sec 4.2.1'). Provide a sensible placeholder if not obvious."),
});

const SummarizeDocumentInputSchema = z.object({
  document: z.object({
    text: z.string().optional().describe('The full text content of the regulations document.'),
    image: z.string().optional().describe("A photo of the regulations document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  })
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  requirements: z.array(RegulationSchema).describe('An array of structured compliance requirements extracted from the document.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;


export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
    return summarizeDocumentFlow(input);
}


const prompt = ai.definePrompt({
    name: 'summarizeDocumentPrompt',
    input: { schema: SummarizeDocumentInputSchema },
    output: { schema: SummarizeDocumentOutputSchema },
    prompt: `You are an expert in aviation regulatory compliance. Your task is to analyze the provided document content (which could be text or an image) and extract each individual compliance requirement.

For each requirement you identify, you must structure it into the following fields:
- regulationCode: The specific number or code of the regulation.
- regulationStatement: The complete, verbatim text of the regulation.
- companyReference: A sensible placeholder for where this might be found in a typical airline's Operations Manual (e.g., "Ops Manual, Sec 4.2.1").

Analyze the following document content and extract all requirements:

{{#if document.text}}
Document Content:
{{document.text}}
{{/if}}

{{#if document.image}}
Document Image:
{{media url=document.image}}
{{/if}}
`,
});

const summarizeDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
