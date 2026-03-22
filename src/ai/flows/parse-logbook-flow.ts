/**
 * @fileOverview This file defines a Genkit flow for parsing the visual structure of a logbook table, including nested headers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LogbookColumnSchema: z.ZodType<LogbookColumn> = z.lazy(() =>
  z.object({
    id: z.string().describe('A unique machine-readable ID for the column (e.g., flightDate).'),
    label: z.string().describe('The human-readable text of the column header (e.g., "DATE").'),
    subColumns: z.array(LogbookColumnSchema).optional().describe('An array of nested sub-columns, if this column spans multiple headers.'),
  })
);

export interface LogbookColumn {
  id: string;
  label: string;
  subColumns?: LogbookColumn[];
}

export const ParseLogbookInputSchema = z.object({
  image: z.string().describe("A photo of the logbook table, as a data URI."),
});
export type ParseLogbookInput = z.infer<typeof ParseLogbookInputSchema>;

export const ParseLogbookOutputSchema = z.object({
  columns: z.array(LogbookColumnSchema).describe('An array representing the structured columns of the logbook table.'),
});
export type ParseLogbookOutput = z.infer<typeof ParseLogbookOutputSchema>;

export async function parseLogbook(input: ParseLogbookInput): Promise<ParseLogbookOutput> {
  return parseLogbookFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseLogbookPrompt',
  input: { schema: ParseLogbookInputSchema },
  output: { schema: ParseLogbookOutputSchema },
  prompt: `You are an expert at analyzing table structures from images. Your task is to analyze the provided image of a flight logbook and extract its column header structure.

Pay close attention to nested headers, where one header spans multiple sub-columns. You must represent this nested structure accurately in your output. For each column, provide a camelCase 'id' and its 'label'.

Example:
If you see a header "PILOT" that spans "Name" and "Signature", the output should be:
{
  "id": "pilot",
  "label": "PILOT",
  "subColumns": [
    { "id": "pilotName", "label": "Name" },
    { "id": "pilotSignature", "label": "Signature" }
  ]
}

If a column has no sub-columns, the 'subColumns' array should be omitted.

Analyze the following logbook image and extract its complete, nested column structure.

Image:
{{media url=image}}
`,
});

const parseLogbookFlow = ai.defineFlow(
  {
    name: 'parseLogbookFlow',
    inputSchema: ParseLogbookInputSchema,
    outputSchema: ParseLogbookOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
