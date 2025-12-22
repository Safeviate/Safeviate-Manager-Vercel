'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-safety-protocol-recommendations.ts';
import '@/ai/flows/summarize-maintenance-logs.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/summarize-regulations-flow.ts';
