/**
 * @fileOverview This file defines a Genkit flow for analyzing a Management of Change proposal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';

// --- Zod Schemas for AI Input and Output ---

export const AnalyzeMocInputSchema = z.object({
  title: z.string().describe("The title of the proposed change."),
  description: z.string().describe("A detailed description of what is changing."),
  reason: z.string().describe("The reason why the change is being made."),
  scope: z.string().describe("Who and what will be affected by the change."),
});
export type AnalyzeMocInput = z.infer<typeof AnalyzeMocInputSchema>;

const riskSchema = z.object({
    id: z.string().describe('A unique UUID for this risk.'),
    description: z.string().describe("A detailed description of the specific risk. This should be a potential negative outcome resulting from the hazard."),
});

const hazardSchema = z.object({
    id: z.string().describe('A unique UUID for this hazard.'),
    description: z.string().describe("A concise description of the hazard. A hazard is a condition or object with the potential to cause or contribute to an aircraft incident or accident."),
    risks: z.array(riskSchema).describe("A list of risks associated with this hazard."),
});

const stepSchema = z.object({
    id: z.string().describe('A unique UUID for this step.'),
    description: z.string().describe("A description of the specific, actionable implementation step."),
    hazards: z.array(hazardSchema).describe("A list of potential hazards that could arise during this step."),
});

const phaseSchema = z.object({
    id: z.string().describe('A unique UUID for this phase.'),
    title: z.string().describe("The title of the implementation phase (e.g., 'Planning & Design', 'Training & Communication', 'Execution', 'Post-Implementation Review')."),
    steps: z.array(stepSchema).describe("A list of steps within this phase."),
});

export const AnalyzeMocOutputSchema = z.object({
  phases: z.array(phaseSchema).describe("An array of logical implementation phases for the proposed change."),
});
export type AnalyzeMocOutput = z.infer<typeof AnalyzeMocOutputSchema>;

// --- Exported Flow Function ---

export async function analyzeMoc(input: AnalyzeMocInput): Promise<AnalyzeMocOutput> {
  return analyzeMocFlow(input);
}

// --- Genkit Prompt Definition ---

const prompt = ai.definePrompt({
  name: 'analyzeMocPrompt',
  input: { schema: AnalyzeMocInputSchema },
  output: { schema: AnalyzeMocOutputSchema },
  prompt: `You are an expert aviation Safety Management System (SMS) consultant. Your task is to analyze a proposed Management of Change (MOC) and break it down into a structured implementation plan.

Based on the provided title, description, reason, and scope of the change, generate a series of logical implementation phases (e.g., "Planning & Design", "Training & Communication", "Execution", "Post-Implementation Review").

For each phase, break it down into specific, actionable steps.

For each step, identify potential hazards that could arise during its execution. A hazard is a condition that could lead to an incident.

For each hazard, identify the specific risks. A risk is the potential outcome of a hazard.

Your output must be a structured JSON object. You MUST generate unique UUIDs for every phase, step, hazard, and risk.

**MOC Details:**
- **Title:** {{{title}}}
- **Description:** {{{description}}}
- **Reason:** {{{reason}}}
- **Scope:** {{{scope}}}
`,
});

// --- Genkit Flow Definition ---

const analyzeMocFlow = ai.defineFlow(
  {
    name: 'analyzeMocFlow',
    inputSchema: AnalyzeMocInputSchema,
    outputSchema: AnalyzeMocOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
      return { phases: [] };
    }
    
    // Ensure all generated items have UUIDs and the full expected structure for the form.
    const phasesWithFullStructure = output.phases.map(phase => ({
      ...phase,
      id: phase.id || uuidv4(),
      steps: (phase.steps || []).map(step => ({
        ...step,
        id: step.id || uuidv4(),
        hazards: (step.hazards || []).map(hazard => ({
          ...hazard,
          id: hazard.id || uuidv4(),
          risks: (hazard.risks || []).map(risk => ({
            ...risk,
            id: risk.id || uuidv4(),
            initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' },
            mitigations: [],
          })),
        })),
      })),
    }));

    return { phases: phasesWithFullStructure };
  }
);
