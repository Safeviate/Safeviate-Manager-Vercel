/**
 * @fileOverview OpenAI-backed document parsing flow for the coherence matrix.
 */

import { z } from 'genkit';

const RegulationSchema = z.object({
  regulationCode: z.string().describe('The full code for the extracted item.'),
  regulationStatement: z.string().describe('The short, official title or heading of the extracted item only.'),
  technicalStandard: z.string().describe('The detailed text body for that specific extracted item only.'),
  companyReference: z.string().describe('A suggested internal manual reference placeholder.'),
  parentRegulationCode: z.string().optional().describe('The parent item code for this extracted item.'),
});

export const SummarizeDocumentInputSchema = z.object({
  targetParentCode: z.string().optional().describe('The code of the selected manual parent item that these extracted items should sit under.'),
  document: z.object({
    text: z.string().optional().describe('The full text content of the regulations document.'),
    images: z.array(z.string()).optional().describe("A sequence of photos of the regulations document, as data URIs."),
  }),
  isMultiPage: z.boolean().optional().describe('If true, treat the sequence of images as a single, continuous document.'),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

export const SummarizeDocumentOutputSchema = z.object({
  requirements: z.array(RegulationSchema).describe('An array of structured compliance requirements extracted from the document.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

const OpenAiRequirementSchema = z.object({
  regulationCode: z.string(),
  regulationStatement: z.string(),
  technicalStandard: z.string(),
  companyReference: z.string(),
  parentRegulationCode: z.string().optional(),
});

const OpenAiSummarizeDocumentOutputSchema = z.object({
  requirements: z.array(OpenAiRequirementSchema).default([]),
});

function extractJsonPayload(content: string) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? content;
  return JSON.parse(candidate.trim());
}

function buildUserContent(input: SummarizeDocumentInput) {
  const textInstructions = [
    'Extract individual compliance requirements for the coherence matrix.',
    'Return only valid JSON in exactly this shape:',
    '{ "requirements": [ { "regulationCode": string, "regulationStatement": string, "technicalStandard": string, "companyReference": string, "parentRegulationCode": string } ] }',
    'Only extract items that belong under the selected parent section.',
    'Do not output the higher-level header or sub-regulation row itself.',
    'Create one card per top-level numbered heading under the selected parent section.',
    'If a top-level heading contains subordinate numbered or lettered lines, keep those subordinate lines inside the same card technicalStandard.',
    'Preserve numbering order and preserve wording as closely as possible.',
    `Selected Parent Code: ${input.targetParentCode || ''}`,
    input.isMultiPage ? 'Treat the supplied images as pages of a single continuous document.' : '',
    input.document.text ? `Document Content:\n${input.document.text}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: textInstructions },
  ];

  for (const image of input.document.images || []) {
    content.push({
      type: 'image_url',
      image_url: { url: image },
    });
  }

  return content;
}

async function runOpenAiSummarizeDocument(input: SummarizeDocumentInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_SUMMARIZE_DOCUMENT || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert aviation regulatory compliance analyst. Return only valid JSON. Extract compliance requirements with careful numbering fidelity and concise headings.',
        },
        {
          role: 'user',
          content: buildUserContent(input),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      'OpenAI request failed while extracting compliance requirements.';
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty response for document summarization.');
  }

  const parsed = extractJsonPayload(content);
  return OpenAiSummarizeDocumentOutputSchema.parse(parsed);
}

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  const output = await runOpenAiSummarizeDocument(input);

  const normalized = output.requirements.map((requirement) => ({
    regulationCode: requirement.regulationCode.trim(),
    regulationStatement: requirement.regulationStatement.trim(),
    technicalStandard: requirement.technicalStandard.trim(),
    companyReference: requirement.companyReference.trim() || 'Ops Manual, Sec TBD',
    parentRegulationCode: requirement.parentRegulationCode?.trim() || input.targetParentCode?.trim() || '',
  }));

  return SummarizeDocumentOutputSchema.parse({ requirements: normalized });
}
