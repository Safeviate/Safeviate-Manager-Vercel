import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Read the Google AI key from the runtime environment.
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: No API Key found in environment variables!");
} else {
  console.log(`Genkit initialized using key: GOOGLE_API_KEY`);
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey }) // No fallback string, let Genkit handle the missing key error
  ],
  model: 'googleai/gemini-2.5-flash', // Use the stable alias you verified in terminal
});
