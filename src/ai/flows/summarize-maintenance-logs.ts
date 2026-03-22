'use server';

/**
 * @fileOverview Summarizes recent aircraft maintenance logs using AI to identify recurring issues and prioritize tasks.
 *
 * - summarizeMaintenanceLogs - A function that summarizes maintenance logs.
 * - SummarizeMaintenanceLogsInput - The input type for the summarizeMaintenanceLogs function.
 * - SummarizeMaintenanceLogsOutput - The return type for the summarizeMaintenanceLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SummarizeMaintenanceLogsInputSchema = z.object({
  maintenanceLogs: z.string().describe('The recent aircraft maintenance logs to summarize.'),
});
export type SummarizeMaintenanceLogsInput = z.infer<typeof SummarizeMaintenanceLogsInputSchema>;

export const SummarizeMaintenanceLogsOutputSchema = z.object({
  summary: z.string().describe('A summary of the recent aircraft maintenance logs.'),
});
export type SummarizeMaintenanceLogsOutput = z.infer<typeof SummarizeMaintenanceLogsOutputSchema>;

export async function summarizeMaintenanceLogs(input: SummarizeMaintenanceLogsInput): Promise<SummarizeMaintenanceLogsOutput> {
  return summarizeMaintenanceLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMaintenanceLogsPrompt',
  input: {schema: SummarizeMaintenanceLogsInputSchema},
  output: {schema: SummarizeMaintenanceLogsOutputSchema},
  prompt: `You are an AI that helps maintenance managers summarize aircraft maintenance logs.

  Summarize the following maintenance logs, identifying recurring issues and potential areas for concern:

  Maintenance Logs:
  {{maintenanceLogs}}
  `,
});

const summarizeMaintenanceLogsFlow = ai.defineFlow(
  {
    name: 'summarizeMaintenanceLogsFlow',
    inputSchema: SummarizeMaintenanceLogsInputSchema,
    outputSchema: SummarizeMaintenanceLogsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
