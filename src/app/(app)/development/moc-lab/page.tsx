'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MainPageHeader } from '@/components/page-header';
import { ArrowRight, Blocks, Columns3, Layers3, Sparkles } from 'lucide-react';

type Mitigation = {
  label: string;
  owner: string;
  status: string;
};

type RiskItem = {
  code: string;
  title: string;
  body: string;
  mitigations: Mitigation[];
};

type StepItem = {
  code: string;
  title: string;
  risks: RiskItem[];
};

type PhaseItem = {
  title: string;
  accent: string;
  steps: StepItem[];
};

const sampleMoc = [
  {
    title: 'Phase 1. Design and approval',
    accent: 'bg-sky-500',
    steps: [
      {
        code: '1.1',
        title: 'Review the proposed change and confirm the scope',
        risks: [
          {
            code: 'R1',
            title: 'Scope drift',
            body: 'Changes are introduced that sit outside the approved request.',
            mitigations: [
              { label: 'Freeze scope brief', owner: 'Project lead', status: 'Open' },
              { label: 'Sign-off gate', owner: 'Accountable manager', status: 'Pending' },
            ],
          },
        ],
      },
      {
        code: '1.2',
        title: 'Obtain technical and safety approval',
        risks: [
          {
            code: 'R2',
            title: 'Unreviewed dependency',
            body: 'A supporting system or document is affected without traceability.',
            mitigations: [
              { label: 'Dependency check', owner: 'Engineering', status: 'Open' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Phase 2. Implementation',
    accent: 'bg-emerald-500',
    steps: [
      {
        code: '2.1',
        title: 'Execute the change in controlled steps',
        risks: [
          {
            code: 'R3',
            title: 'Sequence error',
            body: 'Tasks happen in the wrong order or without the correct hold points.',
            mitigations: [
              { label: 'Step sequence card', owner: 'Supervisor', status: 'In progress' },
              { label: 'Hold point inspection', owner: 'QA', status: 'Open' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Phase 3. Verification and close-out',
    accent: 'bg-amber-500',
    steps: [
      {
        code: '3.1',
        title: 'Validate outcomes and record lessons learned',
        risks: [
          {
            code: 'R4',
            title: 'Incomplete close-out',
            body: 'The change is completed but evidence and lessons are not captured.',
            mitigations: [
              { label: 'Closure pack', owner: 'Project lead', status: 'Open' },
              { label: 'Lessons log', owner: 'Quality', status: 'Open' },
            ],
          },
        ],
      },
    ],
  },
] satisfies PhaseItem[];

function RailCard({
  phase,
  index,
}: {
  phase: PhaseItem;
  index: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${phase.accent} text-white flex items-center justify-center shadow-sm`}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phase {index + 1}</p>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{phase.title}</h3>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase">
          {phase.steps.length} steps
        </Badge>
      </div>
      <div className="space-y-4 p-5">
        {phase.steps.map((step) => (
          <div key={step.code} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{step.code}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{step.title}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full">
                <ArrowRight className="h-3.5 w-3.5" />
                Open
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {step.risks.map((risk) => (
                <div key={risk.code} className="rounded-xl border-l-4 border-l-amber-400 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{risk.code}</p>
                      <p className="mt-1 text-sm font-black uppercase tracking-tight text-slate-900">{risk.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{risk.body}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-800">
                      Risk
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {risk.mitigations.map((mitigation) => (
                      <div key={mitigation.label} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-950">{mitigation.label}</p>
                          <Badge variant="outline" className="rounded-full border-emerald-200 text-[10px] uppercase">
                            {mitigation.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                          Owner: {mitigation.owner}
                        </p>
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
  );
}

function TimelineConcept() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Timeline concept</CardTitle>
        <CardDescription>Phases run vertically as milestones, with each step and risk hanging off a single visual spine.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {sampleMoc.map((phase, index) => (
          <div key={phase.title} className="relative pl-8">
            <div className={`absolute left-2 top-3 h-3 w-3 rounded-full ${phase.accent}`} />
            <div className="absolute left-[13px] top-6 bottom-0 w-px bg-slate-200" />
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phase {index + 1}</p>
              <p className="mt-1 text-sm font-black uppercase tracking-tight text-slate-900">{phase.title}</p>
              <div className="mt-4 space-y-3">
                {phase.steps.map((step) => (
                  <div key={step.code} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{step.code}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{step.title}</p>
                    <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                      {step.risks.map((risk) => (
                        <div key={risk.code} className="rounded-lg bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{risk.code} Hazard</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{risk.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{risk.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LedgerConcept() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Ledger concept</CardTitle>
        <CardDescription>A flat, worksheet-like structure. No nesting drama, just clearly separated rows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {sampleMoc.flatMap((phase, phaseIndex) => [
          <div key={`${phase.title}-heading`} className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phase {phaseIndex + 1}</p>
            <p className="mt-1 text-sm font-black uppercase tracking-tight text-slate-900">{phase.title}</p>
          </div>,
          ...phase.steps.map((step) => (
            <div key={`${phase.title}-${step.code}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{step.code}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                </div>
                <Badge variant="outline" className="rounded-full text-[10px] uppercase">Step</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {step.risks.map((risk) => (
                  <div key={risk.code} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
                      <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-800">Hazard</Badge>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {risk.mitigations.map((mitigation) => (
                        <div key={mitigation.label} className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="text-sm font-medium text-slate-800">{mitigation.label}</p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{mitigation.owner}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )),
        ])}
      </CardContent>
    </Card>
  );
}

export default function MocLabPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col space-y-6 px-4 pb-12 lg:px-6">
      <MainPageHeader
        title="MOC Lab"
        actions={
          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            Prototype workspace
          </Badge>
        }
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Rebuild ideas for change management</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                This sandbox keeps the same MOC concept but tests different ways to present phases, steps, hazards, and mitigations without the old card-within-card feel.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-[0.2em]">No accordion</Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-[0.2em]">No nested cards</Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-[0.2em]">Structured rows</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Design direction</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Make phases feel like lanes, steps feel like rows, hazards feel like highlighted calls, and mitigations feel like action chips.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Best candidate</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                The ledger concept is the safest if we want maximum clarity and minimum visual noise.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bolder option</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                The timeline concept is the most expressive if we want phases to feel like a journey instead of a document.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ScrollArea className="max-h-[calc(100svh-14rem)] rounded-2xl">
          <RailCard phase={sampleMoc[0]} index={0} />
        </ScrollArea>
        <ScrollArea className="max-h-[calc(100svh-14rem)] rounded-2xl">
          <div className="space-y-6 pr-2">
            <TimelineConcept />
            <LedgerConcept />
            <Card className="border-dashed border-slate-300 bg-slate-50/60 shadow-none">
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Next move</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Pick one layout to promote into the live MOC route.
                  </p>
                </div>
                <Layers3 className="h-5 w-5 text-slate-500" />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
