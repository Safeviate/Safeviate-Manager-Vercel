'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { RecurringFindingGroup, RecommendedCorrectiveAction } from '@/types/quality';

export function RecurringFindingPanel({ auditId, findingId, onApply }: { auditId: string; findingId: string; onApply: (recommendation: RecommendedCorrectiveAction) => void }) {
  const [group, setGroup] = useState<RecurringFindingGroup | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/quality-recurring-findings?auditId=${encodeURIComponent(auditId)}&findingId=${encodeURIComponent(findingId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setGroup(payload?.group || null))
      .catch(() => setGroup(null));
  }, [auditId, findingId]);

  const saveRecommendation = async () => {
    const value = description.trim();
    if (!value) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/quality-recurring-findings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auditId, findingId, recommendation: { description: value } }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.group) throw new Error('Unable to save recommendation.');
      setGroup(payload.group);
      setDescription('');
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) return null;
  return <div className="rounded-lg border border-card-border bg-muted/5 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Linked Audit Findings</p><p className="text-xs text-muted-foreground">{group.occurrences.length} matching occurrence{group.occurrences.length === 1 ? '' : 's'} from this checklist item.</p></div>
    </div>
    {group.occurrences.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{group.occurrences.map((occurrence) => <span key={`${occurrence.auditId}:${occurrence.findingId}`} className="rounded-md border bg-background px-2 py-1 text-[10px] font-semibold">{occurrence.auditNumber} · {occurrence.level || 'Unclassified'}</span>)}</div> : null}
    {group.recommendations.length > 0 ? <div className="mt-3 space-y-2">{group.recommendations.map((recommendation) => <div key={recommendation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2"><p className="min-w-0 flex-1 text-xs">{recommendation.description}</p><Button type="button" size="sm" variant="outline" className="h-7 text-[10px] font-black uppercase" onClick={() => onApply(recommendation)}>Apply to this CAP</Button></div>)}</div> : null}
    <div className="mt-3 flex gap-2"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Save a recommended corrective action for matching findings..." className="min-h-16 text-xs" /><Button type="button" size="sm" className="h-8 self-end text-[10px] font-black uppercase" disabled={isSaving || !description.trim()} onClick={() => void saveRecommendation()}>{isSaving ? 'Saving...' : 'Save recommendation'}</Button></div>
  </div>;
}
