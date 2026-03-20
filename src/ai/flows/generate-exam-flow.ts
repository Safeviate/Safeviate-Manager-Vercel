'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a document (text or image) and generating a multiple-choice exam.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';

const optionSchema = z.object({
  id: z.string(),
  text: z.string().describe("The text of the multiple choice option."),
});

const questionSchema = z.object({
  id: z.string(),
  text: z.string().describe("The text of the question."),
  topic: z.string().describe("The specific aviation topic this question belongs to (e.g., 'Meteorology', 'Navigation', 'Air Law')."),
  options: z.array(optionSchema).describe("An array of at least 2-4 multiple choice options."),
  correctOptionId: z.string().describe("The ID of the correct option from the options array."),
});

const GenerateExamInputSchema = z.object({
  document: z.object({
    text: z.string().optional().describe('The full text content of the source document.'),
    image: z.string().optional().describe("A photo of an exam or manual, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  })
});
export type GenerateExamInput = z.infer<typeof GenerateExamInputSchema>;

const GenerateExamOutputSchema = z.object({
  questions: z.array(questionSchema).describe('An array of structured multiple-choice questions extracted or generated from the source.'),
});
export type GenerateExamOutput = z.infer<typeof GenerateExamOutputSchema>;


export async function generateExam(input: GenerateExamInput): Promise<GenerateExamOutput> {
    return generateExamFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateExamPrompt',
    input: { schema: GenerateExamInputSchema },
    output: { schema: GenerateExamOutputSchema },
    prompt: `You are an expert aviation instructor and examiner. Your task is to analyze the provided document content (text or image) and create a structured multiple-choice examination.

**TOPIC IDENTIFICATION**
For every question, you MUST identify the most appropriate aviation topic. Common topics include:
- Air Law
- Meteorology
- Navigation
- Principles of Flight
- Aircraft General Knowledge
- Flight Performance & Planning
- Human Performance
- Operational Procedures
- Communications

If the document contains mixed subjects, categorize each question individually.

If the document is a past exam paper, extract the questions and options exactly as they appear. 
If the document is a manual, regulation, or procedure, generate relevant questions that test critical safety knowledge and comprehension of the material.

**CRITICAL INSTRUCTION: MARKING CORRECT ANSWERS**
For every question, you MUST determine which option is factually correct based on the provided material. Set the 'correctOptionId' to match the 'id' of that correct option. If multiple options could be correct, select the most precise one.

For each question:
1. Identify the specific 'topic'.
2. Provide the question text clearly.
3. Provide at least 4 multiple-choice options that are plausible but distinct.
4. Identify which option is correct based on the source material.
5. Generate a unique ID string for every question and every option so you can cross-reference them.

Analyze the following document and generate the exam questions:

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

const generateExamFlow = ai.defineFlow(
  {
    name: 'generateExamFlow',
    inputSchema: GenerateExamInputSchema,
    outputSchema: GenerateExamOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
      return { questions: [] };
    }

    // Ensure all items have a UUID and the correctOptionId is correctly mapped if we regenerate IDs
    const questionsWithIds = output.questions.map(q => {
      const qId = uuidv4();
      
      const idMap: Record<string, string> = {};
      const optionsWithIds = q.options.map(opt => {
        const newId = uuidv4();
        idMap[opt.id] = newId;
        return {
          ...opt,
          id: newId
        };
      });
      
      // Map the AI's chosen correct ID to our new UUID
      const correctId = idMap[q.correctOptionId] || optionsWithIds[0].id;

      return {
        ...q,
        id: qId,
        options: optionsWithIds,
        correctOptionId: correctId
      }
    });

    return { questions: questionsWithIds };
  }
);
