/**
 * @fileOverview This file defines a Genkit flow for parsing a document (text or image) and extracting compliance requirements, including hierarchical relationships.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RegulationSchema = z.object({
    regulationCode: z.string().describe("The full code for the extracted item, derived from the selected parent section and the source numbering marker."),
    regulationStatement: z.string().describe("The short, official title or heading of the extracted item only."),
    technicalStandard: z.string().describe("The detailed text body for that specific extracted item only. When a heading contains subordinate numbered or lettered lines, keep those subordinate lines together in this field for the same card."),
    companyReference: z.string().describe("A suggested reference to an internal manual (e.g., 'Ops Manual, Sec 4.2.1'). Provide a sensible placeholder if not obvious."),
    parentRegulationCode: z.string().optional().describe("The parent item code for this extracted item. For extracted paragraph cards, this is the selected parent section code."),
});

export const SummarizeDocumentInputSchema = z.object({
  targetParentCode: z.string().optional().describe('The code of the selected manual parent item that these extracted items should sit under.'),
  document: z.object({
    text: z.string().optional().describe('The full text content of the regulations document.'),
    images: z.array(z.string()).optional().describe("A sequence of photos of the regulations document, as data URIs. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  }),
  isMultiPage: z.boolean().optional().describe("If true, treat the sequence of images as a single, continuous document."),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

export const SummarizeDocumentOutputSchema = z.object({
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
    prompt: `You are an expert in aviation regulatory compliance. Your task is to analyze the provided document content (which could be text or a sequence of images) and extract each individual compliance requirement.

You must differentiate between the regulation's title (the 'regulationStatement') and its full descriptive text (the 'technicalStandard').
Only extract items that belong under the selected manual parent section. Do not output the higher-level header or sub-regulation row itself.

For each item you identify, structure it into the following fields:
- regulationCode: Preserve the source numbering structure using the selected parent code as the base. Examples:
  - If targetParentCode is '141.01.18' and the source items are '1.', '2.', '3.', output '141.01.18.1', '141.01.18.2', '141.01.18.3'.
- regulationStatement: The short, official title of the extracted item ONLY. Do not include the detailed text that follows. If the source has a heading like '1. Quality policy and strategy' followed by sub-lines '(1)...(2)...', then the heading text 'Quality policy and strategy' is the regulationStatement for the card.
- technicalStandard: The detailed text body for that exact item. Preserve original wording, line breaks, and indentation where possible. If the heading is followed by subordinate numbered or lettered lines, include all of those subordinate lines in this same field in source order.
- companyReference: A sensible placeholder for where this might be found in a typical airline's Operations Manual (e.g., "Ops Manual, Sec 4.2.1").
- parentRegulationCode: Use targetParentCode for extracted paragraph cards.

Rules:
- The user has already created the parent section manually. Use targetParentCode as the base parent.
- Preserve the original source numbering structure. Do not invent replacement schemes such as 'ATO.CERT.01.1' unless that genuinely follows from targetParentCode plus the source numbering marker.
- Keep the paragraph order exactly as shown in the source.
- Create one card per top-level numbered heading under the selected parent section.
- If a top-level numbered heading contains subordinate numbered or lettered sub-lines, keep those sub-lines inside the same card's technicalStandard instead of creating separate child items.
- Do not use the first subordinate sentence as the card title when the source clearly provides a heading for the numbered item.
- Do not duplicate the numbering marker in both regulationCode and regulationStatement.
- Do not output the selected parent row itself.

Example Breakdown:
Document snippet:
"
Target parent code: 141.01.18
2. Quality assurance
(1) The term quality assurance (QA) is frequently misunderstood to mean the testing and checking of products and services.
(2) An ATO that only do checking and testing activities is applying 'quality control' measures...
(3) Quality control, by itself, provides limited value without the suite of complementary activities that comprise QA.
(4) QA, on the other hand, attempts to improve and stabilise the training process...
(5) A quality assurance plan for an ATO shall encompass well-designed and documented policies, processes and procedures necessary to -
(a) monitor training services and process controls;
(b) monitor assessment and testing methods;
"

Expected Output Objects:
1. {
     regulationCode: '141.01.18.2',
     regulationStatement: 'Quality assurance',
     technicalStandard: '(1) The term quality assurance (QA) is frequently misunderstood to mean the testing and checking of products and services.\n\n(2) An ATO that only do checking and testing activities is applying ''quality control'' measures...\n\n(3) Quality control, by itself, provides limited value without the suite of complementary activities that comprise QA.\n\n(4) QA, on the other hand, attempts to improve and stabilise the training process...\n\n(5) A quality assurance plan for an ATO shall encompass well-designed and documented policies, processes and procedures necessary to -\n(a) monitor training services and process controls;\n(b) monitor assessment and testing methods;',
     parentRegulationCode: '141.01.18',
     companyReference: '...'
   }
   
{{#if isMultiPage}}
You will be given a sequence of images. Treat them as pages of a single document, in the order they are provided. Text may flow from one image to the next.
{{/if}}

Analyze the following document and extract all requirements:

Selected Parent Code:
{{targetParentCode}}

{{#if document.text}}
Document Content:
{{document.text}}
{{/if}}

{{#if document.images}}
Document Images:
{{#each document.images}}
{{media url=this}}
{{/each}}
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
