'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { QualityChecklistItem, QualityChecklistResponse, QualityChecklistRun, QualityChecklistTemplate } from '@/types/quality';

export default function QualityChecklistRunPage({ params }: { params: Promise<{ checklistId: string }> }) {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const [checklistId, setChecklistId] = useState('');
  const [checklist, setChecklist] = useState<QualityChecklistRun | null>(null);
  const [template, setTemplate] = useState<QualityChecklistTemplate | null>(null);
  const [responses, setResponses] = useState<QualityChecklistResponse[]>([]);

  useEffect(() => { void params.then(({ checklistId: id }) => setChecklistId(id)); }, [params]);
  useEffect(() => { if (!checklistId) return; void fetch('/api/quality-checklists', { cache: 'no-store' }).then((r) => r.json()).then((payload) => { const run = (payload.checklists || []).find((item: QualityChecklistRun) => item.id === checklistId) || null; setChecklist(run); setTemplate(run ? (payload.templates || []).find((item: QualityChecklistTemplate) => item.id === run.templateId) || null : null); setResponses(run?.responses || []); }); }, [checklistId]);

  const responseFor = (id: string) => responses.find((response) => response.checklistItemId === id) || { checklistItemId: id };
  const updateResponse = (id: string, patch: Partial<QualityChecklistResponse>) => setResponses((current) => { const existing = current.find((item) => item.checklistItemId === id) || { checklistItemId: id }; return [...current.filter((item) => item.checklistItemId !== id), { ...existing, ...patch }]; });
  const items = useMemo(() => template?.sections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title }))) || [], [template]);

  const save = async (complete = false) => {
    if (!checklist) return;
    const next: QualityChecklistRun = { ...checklist, responses, status: complete ? 'Completed' : checklist.status, completedAt: complete ? new Date().toISOString() : checklist.completedAt, completedById: complete ? userProfile?.id : checklist.completedById, completedByName: complete ? userProfile?.email || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() : checklist.completedByName };
    const response = await fetch('/api/quality-checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist: next }) });
    if (!response.ok) { toast({ variant: 'destructive', title: 'Unable to save checklist' }); return; }
    setChecklist(next); toast({ title: complete ? 'Checklist completed' : 'Checklist saved', description: complete ? 'This completion record is separate from audits.' : 'Your checklist progress has been saved.' });
  };

  if (!checklist || !template) return <div className="p-6 text-sm text-muted-foreground">Loading checklist…</div>;
  const isComplete = checklist.status === 'Completed';
  const completedCount = items.filter((item) => {
    const value = responseFor(item.id).value;
    return item.type === 'Checkbox' ? value === true : typeof value === 'string' && value.trim().length > 0;
  }).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] min-h-0 w-full max-w-[900px] flex-col gap-4 px-1 pt-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/quality/checklists"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Checklists</Link>
      </Button>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-0 p-0">
          <header className="border-b bg-muted/20 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{checklist.status}</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight">{checklist.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Complete each task below. This is a checklist completion record, not an audit.</p>
              </div>
              <div className="w-full rounded-md border bg-background px-3 py-2 md:w-52">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"><span>Progress</span><span>{completedCount} / {items.length}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/5 p-4 md:p-6">
            {template.sections.map((section) => (
              <section key={section.id} className="overflow-hidden rounded-lg border bg-background shadow-none">
                <div className="border-b bg-muted/20 px-4 py-3"><h2 className="text-sm font-semibold">{section.title}</h2></div>
                <div className="divide-y">
                  {section.items.map((item: QualityChecklistItem, index) => {
                    const response = responseFor(item.id);
                    return (
                      <div key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(210px,0.55fr)] md:items-start">
                        <div className="flex gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-black text-muted-foreground">{index + 1}</span>
                          <p className="pt-0.5 text-sm font-medium leading-5">{item.text}</p>
                        </div>
                        <div className="space-y-2">
                          {item.type === 'Checkbox' ? (
                            <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium">
                              <Checkbox checked={response.value === true} disabled={isComplete} onCheckedChange={(value) => updateResponse(item.id, { value: value === true })} />
                              Completed
                            </label>
                          ) : item.type === 'YesNoNA' ? (
                            <Select value={typeof response.value === 'string' ? response.value : ''} disabled={isComplete} onValueChange={(value) => updateResponse(item.id, { value })}>
                              <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                              <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="N/A">N/A</SelectItem></SelectContent>
                            </Select>
                          ) : item.type === 'Textbox' ? (
                            <Textarea value={typeof response.value === 'string' ? response.value : ''} disabled={isComplete} onChange={(event) => updateResponse(item.id, { value: event.target.value })} placeholder="Enter response" className="min-h-20" />
                          ) : (
                            <Input type={item.type === 'Date' ? 'date' : 'number'} value={typeof response.value === 'string' ? response.value : ''} disabled={isComplete} onChange={(event) => updateResponse(item.id, { value: event.target.value })} />
                          )}
                          <Input value={response.notes || ''} disabled={isComplete} onChange={(event) => updateResponse(item.id, { notes: event.target.value })} placeholder="Optional note" className="h-8 text-xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {!isComplete && (
            <footer className="flex shrink-0 flex-col gap-2 border-t bg-background p-3 md:flex-row md:justify-end md:px-6">
              <Button variant="outline" onClick={() => void save(false)} className="w-full md:w-auto"><Save className="mr-1.5 h-4 w-4" />Save progress</Button>
              <Button onClick={() => void save(true)} className="w-full md:w-auto">Complete checklist</Button>
            </footer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
