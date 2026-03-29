import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: Neither GEMINI_API_KEY nor GOOGLE_GENAI_API_KEY is available in the environment!");
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: apiKey || 'MISSING_API_KEY' })],
  model: 'googleai/gemini-2.5-pro',
});
