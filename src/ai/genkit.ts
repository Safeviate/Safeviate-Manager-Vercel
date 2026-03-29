import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: Neither GEMINI_API_KEY nor GOOGLE_GENAI_API_KEY is available in the environment!");
} else {
    const keySource = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_GENAI_API_KEY';
    console.log(`Genkit initialized using key from: ${keySource}`);
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: apiKey || 'MISSING_API_KEY' })],
  model: 'googleai/gemini-1.5-pro',
});
