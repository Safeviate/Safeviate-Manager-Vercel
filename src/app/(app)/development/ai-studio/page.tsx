'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, FileText, ImageIcon, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { callAiFlow } from '@/lib/ai-client';
import type { AnalyzeMocOutput } from '@/ai/flows/analyze-moc-flow';
import type { GenerateChecklistOutput } from '@/ai/flows/generate-checklist-flow';
import type { GenerateExamOutput } from '@/ai/flows/generate-exam-flow';
import type { GenerateSafetyProtocolRecommendationsOutput } from '@/ai/flows/generate-safety-protocol-recommendations';
import type { ParseLogbookOutput } from '@/ai/flows/parse-logbook-flow';
import type { SummarizeDocumentOutput } from '@/ai/flows/summarize-document-flow';
import type { SummarizeMaintenanceLogsOutput } from '@/ai/flows/summarize-maintenance-logs';

type FlowKey =
  | 'analyzeMoc'
  | 'generateChecklist'
  | 'generateExam'
  | 'generateSafetyProtocolRecommendations'
  | 'parseLogbook'
  | 'summarizeDocument'
  | 'summarizeMaintenanceLogs';

type FlowResultMap = {
  analyzeMoc: AnalyzeMocOutput;
  generateChecklist: GenerateChecklistOutput;
  generateExam: GenerateExamOutput;
  generateSafetyProtocolRecommendations: GenerateSafetyProtocolRecommendationsOutput;
  parseLogbook: ParseLogbookOutput;
  summarizeDocument: SummarizeDocumentOutput;
  summarizeMaintenanceLogs: SummarizeMaintenanceLogsOutput;
};

type JsonLike = Record<string, unknown>;

const flowLabels: Record<FlowKey, string> = {
  analyzeMoc: 'MOC Analysis',
  generateChecklist: 'Checklist Builder',
  generateExam: 'Exam Builder',
  generateSafetyProtocolRecommendations: 'Safety Recommendations',
  parseLogbook: 'Logbook Parser',
  summarizeDocument: 'Regulation Extractor',
  summarizeMaintenanceLogs: 'Maintenance Summary',
};

const emptyState = {
  analyzeMoc: {
    title: '',
    description: '',
    reason: '',
    scope: '',
  },
  generateChecklist: {
    text: '',
    image: '',
  },
  generateExam: {
    text: '',
    image: '',
  },
  generateSafetyProtocolRecommendations: {
    incidentReports: '',
  },
  parseLogbook: {
    image: '',
  },
  summarizeDocument: {
    targetParentCode: '',
    text: '',
    images: '',
    isMultiPage: true,
  },
  summarizeMaintenanceLogs: {
    maintenanceLogs: '',
  },
} satisfies Record<FlowKey, JsonLike>;

function JsonRenderer({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[56rem] overflow-auto rounded-2xl border bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function arrayFromLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function FlowCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-0 overflow-hidden border-slate-200/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 space-y-4 overflow-y-auto">{children}</CardContent>
    </Card>
  );
}

export default function AiStudioPage() {
  const { toast } = useToast();
  const [activeFlow, setActiveFlow] = useState<FlowKey>('analyzeMoc');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Partial<FlowResultMap>>({});
  const [state, setState] = useState(emptyState);

  const activeTitle = useMemo(() => flowLabels[activeFlow], [activeFlow]);

  const runFlow = async (flow: FlowKey) => {
    setIsRunning(true);
    try {
      let payload: unknown;
      switch (flow) {
        case 'analyzeMoc':
          payload = state.analyzeMoc;
          if (!state.analyzeMoc.title || !state.analyzeMoc.description || !state.analyzeMoc.reason || !state.analyzeMoc.scope) {
            throw new Error('Fill in all MOC fields before running the analysis.');
          }
          break;
        case 'generateChecklist':
          payload = {
            document: {
              text: state.generateChecklist.text || undefined,
              image: state.generateChecklist.image || undefined,
            },
          };
          if (!state.generateChecklist.text && !state.generateChecklist.image) {
            throw new Error('Provide either checklist text or an image.');
          }
          break;
        case 'generateExam':
          payload = {
            document: {
              text: state.generateExam.text || undefined,
              image: state.generateExam.image || undefined,
            },
          };
          if (!state.generateExam.text && !state.generateExam.image) {
            throw new Error('Provide either exam text or an image.');
          }
          break;
        case 'generateSafetyProtocolRecommendations':
          payload = { incidentReports: state.generateSafetyProtocolRecommendations.incidentReports };
          if (!state.generateSafetyProtocolRecommendations.incidentReports) {
            throw new Error('Enter incident report text first.');
          }
          break;
        case 'parseLogbook':
          payload = { image: state.parseLogbook.image };
          if (!state.parseLogbook.image) throw new Error('Paste a logbook image data URI first.');
          break;
        case 'summarizeDocument':
          payload = {
            targetParentCode: state.summarizeDocument.targetParentCode || undefined,
            document: {
              text: state.summarizeDocument.text || undefined,
              images: arrayFromLines(state.summarizeDocument.images || ''),
            },
            isMultiPage: state.summarizeDocument.isMultiPage,
          };
          if (!state.summarizeDocument.text && !state.summarizeDocument.images) {
            throw new Error('Provide regulation text or one or more image data URIs.');
          }
          break;
        case 'summarizeMaintenanceLogs':
          payload = { maintenanceLogs: state.summarizeMaintenanceLogs.maintenanceLogs };
          if (!state.summarizeMaintenanceLogs.maintenanceLogs) {
            throw new Error('Paste maintenance log text first.');
          }
          break;
      }

      const result = await callAiFlow<typeof payload, FlowResultMap[FlowKey]>(flow, payload as any);
      setResults((current) => ({ ...current, [flow]: result }));
      toast({
        title: 'AI flow complete',
        description: `${flowLabels[flow]} finished successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'AI flow failed',
        description: error?.message || 'The AI request could not be completed.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <MainPageHeader
        title="AI Studio"
        description="A single workspace for every AI flow currently available in Safeviate."
      />

      <Tabs value={activeFlow} onValueChange={(value) => setActiveFlow(value as FlowKey)} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl p-2 md:grid-cols-4 xl:grid-cols-7">
          {(Object.keys(flowLabels) as FlowKey[]).map((flow) => (
            <TabsTrigger key={flow} value={flow} className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]">
              {flowLabels[flow]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                <Sparkles className="h-5 w-5" />
                Input Studio
              </CardTitle>
              <CardDescription>
                Prepare the data for {activeTitle} and execute it against the existing `/api/ai` route.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto">
              <TabsContent value="analyzeMoc" className="mt-0 space-y-4">
                <FlowCard title="Management of Change" description="Generate a phased implementation plan with hazards and risks.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Title</label><Input value={state.analyzeMoc.title} onChange={(e) => setState((c) => ({ ...c, analyzeMoc: { ...c.analyzeMoc, title: e.target.value } }))} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Description</label><Textarea rows={4} value={state.analyzeMoc.description} onChange={(e) => setState((c) => ({ ...c, analyzeMoc: { ...c.analyzeMoc, description: e.target.value } }))} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Reason</label><Textarea rows={3} value={state.analyzeMoc.reason} onChange={(e) => setState((c) => ({ ...c, analyzeMoc: { ...c.analyzeMoc, reason: e.target.value } }))} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Scope</label><Textarea rows={3} value={state.analyzeMoc.scope} onChange={(e) => setState((c) => ({ ...c, analyzeMoc: { ...c.analyzeMoc, scope: e.target.value } }))} /></div>
                </FlowCard>
              </TabsContent>

              <TabsContent value="generateChecklist" className="mt-0 space-y-4">
                <FlowCard title="Checklist Builder" description="Extract sections and checklist items from text or an image data URI.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Text</label><Textarea rows={10} value={state.generateChecklist.text} onChange={(e) => setState((c) => ({ ...c, generateChecklist: { ...c.generateChecklist, text: e.target.value } }))} placeholder="Paste checklist content here." /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Image data URI</label><Textarea rows={4} value={state.generateChecklist.image} onChange={(e) => setState((c) => ({ ...c, generateChecklist: { ...c.generateChecklist, image: e.target.value } }))} placeholder="data:image/png;base64,..." /></div>
                </FlowCard>
              </TabsContent>

              <TabsContent value="generateExam" className="mt-0 space-y-4">
                <FlowCard title="Exam Builder" description="Create structured multiple-choice questions from text or an image.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Text</label><Textarea rows={10} value={state.generateExam.text} onChange={(e) => setState((c) => ({ ...c, generateExam: { ...c.generateExam, text: e.target.value } }))} placeholder="Paste exam source material here." /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Image data URI</label><Textarea rows={4} value={state.generateExam.image} onChange={(e) => setState((c) => ({ ...c, generateExam: { ...c.generateExam, image: e.target.value } }))} placeholder="data:image/png;base64,..." /></div>
                </FlowCard>
              </TabsContent>

              <TabsContent value="generateSafetyProtocolRecommendations" className="mt-0 space-y-4">
                <FlowCard title="Safety Recommendations" description="Summarize incident reports into actionable protocol recommendations.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Incident reports</label><Textarea rows={14} value={state.generateSafetyProtocolRecommendations.incidentReports} onChange={(e) => setState((c) => ({ ...c, generateSafetyProtocolRecommendations: { incidentReports: e.target.value } }))} /></div>
                </FlowCard>
              </TabsContent>

              <TabsContent value="parseLogbook" className="mt-0 space-y-4">
                <FlowCard title="Logbook Parser" description="Parse a logbook page image into a nested header structure.">
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    <ImageIcon className="mb-2 h-5 w-5" />
                    Paste a `data:image/...;base64,...` image string below.
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Image data URI</label><Textarea rows={8} value={state.parseLogbook.image} onChange={(e) => setState((c) => ({ ...c, parseLogbook: { image: e.target.value } }))} /></div>
                </FlowCard>
              </TabsContent>

              <TabsContent value="summarizeDocument" className="mt-0 space-y-4">
                <FlowCard title="Regulation Extractor" description="Extract compliance requirements from text or multiple page images.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Target parent code</label><Input value={state.summarizeDocument.targetParentCode} onChange={(e) => setState((c) => ({ ...c, summarizeDocument: { ...c.summarizeDocument, targetParentCode: e.target.value } }))} placeholder="e.g. 141.01.18" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Text</label><Textarea rows={8} value={state.summarizeDocument.text} onChange={(e) => setState((c) => ({ ...c, summarizeDocument: { ...c.summarizeDocument, text: e.target.value } }))} placeholder="Paste regulation text here." /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Image data URIs</label><Textarea rows={5} value={state.summarizeDocument.images} onChange={(e) => setState((c) => ({ ...c, summarizeDocument: { ...c.summarizeDocument, images: e.target.value } }))} placeholder="One data URI per line." /></div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={state.summarizeDocument.isMultiPage} onChange={(e) => setState((c) => ({ ...c, summarizeDocument: { ...c.summarizeDocument, isMultiPage: e.target.checked } }))} />
                    Treat images as one multi-page document
                  </label>
                </FlowCard>
              </TabsContent>

              <TabsContent value="summarizeMaintenanceLogs" className="mt-0 space-y-4">
                <FlowCard title="Maintenance Summary" description="Summarize recurring issues and concerns from maintenance log text.">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Maintenance logs</label><Textarea rows={14} value={state.summarizeMaintenanceLogs.maintenanceLogs} onChange={(e) => setState((c) => ({ ...c, summarizeMaintenanceLogs: { maintenanceLogs: e.target.value } }))} /></div>
                </FlowCard>
              </TabsContent>
            </CardContent>
          </Card>

          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                <Wand2 className="h-5 w-5" />
                Output
              </CardTitle>
              <CardDescription>Inspect the structured result returned by the AI flow.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => runFlow(activeFlow)} disabled={isRunning}>
                  {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Run {activeTitle}
                </Button>
                <Button variant="outline" onClick={() => setResults({})} disabled={isRunning}>
                  Clear results
                </Button>
              </div>

              <Separator className="my-4" />

              {results[activeFlow] ? (
                <div className="space-y-4">
                  {activeFlow === 'analyzeMoc' && (
                    <div className="space-y-3">
                      {(results.analyzeMoc as AnalyzeMocOutput).phases.map((phase, index) => (
                        <div key={phase.id} className="rounded-2xl border p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Phase {index + 1}</p>
                          <h3 className="mt-1 text-lg font-black uppercase">{phase.title}</h3>
                          <div className="mt-3 space-y-3">
                            {phase.steps.map((step) => (
                              <div key={step.id} className="rounded-xl border bg-muted/20 p-3">
                                <p className="font-semibold">{step.description}</p>
                                <div className="mt-2 space-y-2">
                                  {step.hazards.map((hazard) => (
                                    <div key={hazard.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                                      <p className="text-sm font-semibold">Hazard: {hazard.description}</p>
                                      <div className="mt-2 space-y-2">
                                        {hazard.risks.map((risk) => (
                                          <div key={risk.id} className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-sm">
                                            Risk: {risk.description}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeFlow === 'generateChecklist' && <JsonRenderer value={results.generateChecklist} />}
                  {activeFlow === 'generateExam' && <JsonRenderer value={results.generateExam} />}
                  {activeFlow === 'generateSafetyProtocolRecommendations' && (
                    <div className="rounded-2xl border bg-muted/20 p-4 text-sm leading-7 whitespace-pre-wrap">{results.generateSafetyProtocolRecommendations?.recommendations}</div>
                  )}
                  {activeFlow === 'parseLogbook' && <JsonRenderer value={results.parseLogbook} />}
                  {activeFlow === 'summarizeDocument' && <JsonRenderer value={results.summarizeDocument} />}
                  {activeFlow === 'summarizeMaintenanceLogs' && (
                    <div className="rounded-2xl border bg-muted/20 p-4 text-sm leading-7 whitespace-pre-wrap">{results.summarizeMaintenanceLogs?.summary}</div>
                  )}
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed bg-muted/10 text-center text-muted-foreground">
                  <div>
                    <AlertTriangle className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm font-medium">Run the selected flow to see results here.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
