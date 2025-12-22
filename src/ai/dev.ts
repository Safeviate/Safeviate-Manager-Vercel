'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-safety-protocol-recommendations.ts';
import '@/ai/flows/summarize-maintenance-logs.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/summarize-document-flow.ts';
import '@/ai/flows/generate-checklist-flow.ts';
