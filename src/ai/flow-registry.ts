import { z } from 'genkit';
import {
  analyzeMoc,
  AnalyzeMocInputSchema,
} from '@/ai/flows/analyze-moc-flow';
import {
  generateChecklist,
  GenerateChecklistInputSchema,
} from '@/ai/flows/generate-checklist-flow';
import {
  generateExam,
  GenerateExamInputSchema,
} from '@/ai/flows/generate-exam-flow';
import {
  generateSafetyProtocolRecommendations,
  GenerateSafetyProtocolRecommendationsInputSchema,
} from '@/ai/flows/generate-safety-protocol-recommendations';
import {
  parseLogbook,
  ParseLogbookInputSchema,
} from '@/ai/flows/parse-logbook-flow';
import {
  summarizeDocument,
  SummarizeDocumentInputSchema,
} from '@/ai/flows/summarize-document-flow';
import {
  summarizeMaintenanceLogs,
  SummarizeMaintenanceLogsInputSchema,
} from '@/ai/flows/summarize-maintenance-logs';

type FlowDefinition = {
  inputSchema: z.ZodTypeAny;
  run: (input: any) => Promise<unknown>;
};

export const flowRegistry = {
  analyzeMoc: {
    inputSchema: AnalyzeMocInputSchema,
    run: analyzeMoc,
  },
  generateChecklist: {
    inputSchema: GenerateChecklistInputSchema,
    run: generateChecklist,
  },
  generateExam: {
    inputSchema: GenerateExamInputSchema,
    run: generateExam,
  },
  generateSafetyProtocolRecommendations: {
    inputSchema: GenerateSafetyProtocolRecommendationsInputSchema,
    run: generateSafetyProtocolRecommendations,
  },
  parseLogbook: {
    inputSchema: ParseLogbookInputSchema,
    run: parseLogbook,
  },
  summarizeDocument: {
    inputSchema: SummarizeDocumentInputSchema,
    run: summarizeDocument,
  },
  summarizeMaintenanceLogs: {
    inputSchema: SummarizeMaintenanceLogsInputSchema,
    run: summarizeMaintenanceLogs,
  },
} satisfies Record<string, FlowDefinition>;

export type RegisteredFlowName = keyof typeof flowRegistry;
