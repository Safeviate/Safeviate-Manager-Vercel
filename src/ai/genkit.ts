import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// 1. Prioritize the official Google name
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: No API Key found in environment variables!");
} else {
  // Useful for your logs to see which one Firebase is actually passing
  const keySource = process.env.GOOGLE_GENAI_API_KEY ? 'GOOGLE_GENAI_API_KEY' : 'GEMINI_API_KEY';
  console.log(`Genkit initialized using key from: ${keySource}`);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey }) // No fallback string, let Genkit handle the missing key error
  ],
  model: 'googleai/gemini-1.5-flash', // Use the stable alias you verified in terminal
});
