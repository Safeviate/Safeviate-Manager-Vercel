import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getMissingEnvVars } from '@/lib/server/env';

// Read the Google AI key from the runtime environment.
const apiKey = process.env.GOOGLE_API_KEY;
const missingGoogleAiEnv = getMissingEnvVars(['GOOGLE_API_KEY']);
const plugins = apiKey ? [googleAI({ apiKey })] : [];

if (missingGoogleAiEnv.length > 0) {
  console.warn(`[env] Missing required environment variables for Google AI: ${missingGoogleAiEnv.join(', ')}`);
} else {
  console.log(`Genkit initialized using key: GOOGLE_API_KEY`);
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash', // Use the stable alias you verified in terminal
});
