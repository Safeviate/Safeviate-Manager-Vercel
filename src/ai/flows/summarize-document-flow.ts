
'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a document (text or image) and extracting compliance requirements, including hierarchical relationships.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RegulationSchema = z.object({
    regulationCode: z.string().describe("The official code for the regulation (e.g., '141.02.2' or '1.1')."),
    regulationStatement: z.string().describe("The short, official title or heading of the regulation (e.g., 'Quality policy and strategy')."),
    technicalStandard: z.string().describe("The full, detailed text body of the regulation, including all sub-points like (a), (b), (i), etc. This should contain the complete description of what the regulation requires."),
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
    prompt: `You are an expert in aviation regulatory compliance. Your task is to analyze the provided document content (which could be text or an image) and extract each individual compliance requirement.

You must differentiate between the regulation's title (the 'regulationStatement') and its full descriptive text (the 'technicalStandard').

For each item you identify, structure it into the following fields:
- regulationCode: The specific number or code (e.g., '141.01.18' for a main section, or a sub-number like '1.' which you should combine with its parent to form '141.01.18.1').
- regulationStatement: The short, official title of the regulation ONLY. Do not include the detailed text that follows. For example, for "1. Quality policy and strategy", this field should be "Quality policy and strategy".
- technicalStandard: The full, detailed text body of the regulation. This includes all sub-points like (1), (a), (b), (i), etc., combined into a single string. IMPORTANT: Preserve all original formatting, including line breaks and indentation for lists. For a main heading with no body text, this field can be an empty string.
- companyReference: A sensible placeholder for where this might be found in a typical airline's Operations Manual (e.g., "Ops Manual, Sec 4.2.1").
- parentRegulationCode: If it's a sub-regulation (like '1. Quality policy...'), its 'parentRegulationCode' should be the code of the main heading it falls under (e.g., '141.01.18'). For top-level headings, this field should be omitted.

Example Breakdown:
Document snippet:
"
141.01.18 QUALITY ASSURANCE AND QUALITY SYSTEM
An approved training organisation must establish a quality assurance programme and a quality system that includes:
(1) a quality policy and strategy; and
(2) quality procedures; and
(3) a quality manager.
1. Quality policy and strategy
The quality policy and strategy must be defined in writing...
"

Expected Output Objects:
1. {
     regulationCode: '141.01.18',
     regulationStatement: 'QUALITY ASSURANCE AND QUALITY SYSTEM',
     technicalStandard: 'An approved training organisation must establish a quality assurance programme and a quality system that includes:\\n(1) a quality policy and strategy; and\\n(2) quality procedures; and\\n(3) a quality manager.',
     companyReference: '...'
   }
2. {
     regulationCode: '141.01.18.1',
     regulationStatement: 'Quality policy and strategy',
     technicalStandard: 'The quality policy and strategy must be defined in writing...',
     parentRegulationCode: '141.01.18',
     companyReference: '...'
   }

Analyze the following document and extract all requirements:

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
