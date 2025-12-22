
'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a document (text or image) and extracting compliance requirements, including hierarchical relationships.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RegulationSchema = z.object({
    regulationCode: z.string().describe("The official code for the regulation (e.g., '141.02.2' or '1.1')."),
    regulationStatement: z.string().describe("The full text of the regulation or heading."),
    companyReference: z.string().describe("A suggested reference to an internal manual (e.g., 'Ops Manual, Sec 4.2.1'). Provide a sensible placeholder if not obvious."),
    parentRegulationCode: z.string().optional().describe("The code of the parent regulation if this is a sub-regulation (e.g., '141.01.18' would be the parent of '141.01.18.1'). Leave empty for top-level regulations."),
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
    prompt: `You are an expert in aviation regulatory compliance. Your task is to analyze the provided document content (which could be text or an image) and extract each individual compliance requirement, paying close attention to the hierarchy.

For each item you identify, you must structure it into the following fields:
- regulationCode: The specific number or code of the regulation (e.g., '141.01.18' for a main section, or a sub-number like '1.' which you should combine with its parent to form '141.01.18.1').
- regulationStatement: The complete, verbatim text of the regulation or heading.
- companyReference: A sensible placeholder for where this might be found in a typical airline's Operations Manual (e.g., "Ops Manual, Sec 4.2.1").
- parentRegulationCode: If it's a sub-regulation (like '1. Quality policy...'), its 'parentRegulationCode' should be the code of the main heading (e.g., '141.01.18'). For top-level headings, this field should be omitted.

Example: For a heading '141.01.18 QUALITY ASSURANCE' with a sub-item '1. Quality policy', you should produce two objects:
1. { regulationCode: '141.01.18', regulationStatement: 'QUALITY ASSURANCE AND QUALITY SYSTEM', companyReference: '...' }
2. { regulationCode: '141.01.18.1', regulationStatement: 'Quality policy and strategy', companyReference: '...', parentRegulationCode: '141.01.18' }

Analyze the following document content and extract all requirements, including their hierarchy:

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
