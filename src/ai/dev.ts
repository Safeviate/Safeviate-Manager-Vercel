
'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-safety-protocol-recommendations.ts';
import '@/ai/flows/summarize-maintenance-logs.ts';
import '@/ai/flows/summarize-document-flow.ts';
import '@/ai/flows/generate-checklist-flow.ts';
import '@/ai/flows/parse-logbook-flow.ts';
import '@/ai/flows/analyze-moc-flow.ts';
