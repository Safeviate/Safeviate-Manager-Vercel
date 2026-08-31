'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchiveRestore, ClipboardCheck, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { ChecklistTemplateDialog } from './checklist-template-dialog';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { ArchiveActionButton } from '@/components/record-action-buttons';
import { createClientId } from '@/lib/client/create-client-id';
import type { QualityChecklistRun, QualityChecklistTemplate } from '@/types/quality';

export default function QualityChecklistsPage() {
  const { isLoading: accessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/checklists' });
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [templates, setTemplates] = useState<QualityChecklistTemplate[]>([]);
  const [checklists, setChecklists] = useState<QualityChecklistRun[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    const checklistResponse = await fetch('/api/quality-checklists', { cache: 'no-store' });
    const checklistPayload = await checklistResponse.json();
    setTemplates(Array.isArray(checklistPayload.templates) ? checklistPayload.templates : []);
    setChecklists(Array.isArray(checklistPayload.checklists) ? checklistPayload.checklists : []);
  };

  useEffect(() => {
    void load();
    window.addEventListener('safeviate-quality-checklists-updated', load);
    window.addEventListener('safeviate-quality-templates-updated', load);
    return () => {
      window.removeEventListener('safeviate-quality-checklists-updated', load);
      window.removeEventListener('safeviate-quality-templates-updated', load);
    };
  }, []);

  const startChecklist = async (template: QualityChecklistTemplate) => {
    const checklist: QualityChecklistRun = { id: createClientId(), templateId: template.id, templateTitle: template.title, title: template.title, status: 'In Progress', startedAt: new Date().toISOString(), responses: [] };
    const response = await fetch('/api/quality-checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist }) });
    if (!response.ok) { toast({ variant: 'destructive', title: 'Unable to start checklist', description: 'The checklist run was not created.' }); return; }
    const payload = await response.json();
    window.location.assign(`/quality/checklists/${payload.checklist.id}`);
  };

  const archiveRecord = async (entity: 'template' | 'run', id: string, action: 'archive' | 'restore') => {
    const response = await fetch('/api/quality-checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, action }),
    });
    if (!response.ok) {
      toast({ variant: 'destructive', title: `Unable to ${action} checklist`, description: 'Please try again.' });
      return;
    }
    toast({ title: action === 'archive' ? 'Checklist archived' : 'Checklist restored' });
    await load();
  };

  const canArchive = hasPermission('quality-checklists-archive');
  const visibleTemplates = templates.filter((template) => showArchived ? Boolean(template.archivedAt) : !template.archivedAt);
  const visibleChecklists = checklists.filter((checklist) => showArchived ? checklist.status === 'Archived' : checklist.status !== 'Archived');

  if (!accessLoading && !isAllowed) return <TenantLayoutDisabledState />;

  return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-1 pt-4">
    <Card className="overflow-hidden border shadow-none">
      <MainPageHeader title="Checklists" actions={<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Active items' : 'Archived items'}</Button><ChecklistTemplateDialog /></div>}/>
      <CardContent className="space-y-6 bg-muted/5 p-4 md:p-6">
        <section className="space-y-3"><div><p className="text-sm font-semibold">Checklist templates</p><p className="text-xs text-muted-foreground">{showArchived ? 'Archived templates are retained and can be restored.' : 'Create a repeatable checklist, then start a separate checklist run.'}</p></div>
          {visibleTemplates.length ? <div className="grid gap-3 md:grid-cols-2">{visibleTemplates.map((template) => <Card key={template.id} className="border shadow-none"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{template.title}</p><p className="text-xs text-muted-foreground">{template.sections.reduce((total, section) => total + section.items.length, 0)} items</p></div>{showArchived ? (canArchive && <Button variant="outline" size="sm" onClick={() => void archiveRecord('template', template.id, 'restore')}><ArchiveRestore className="mr-1.5 h-4 w-4"/>Restore</Button>) : <div className="flex items-center gap-2"><Button size="sm" onClick={() => void startChecklist(template)}><PlayCircle className="mr-1.5 h-4 w-4"/>Start checklist</Button>{canArchive && <ArchiveActionButton srLabel={`Archive ${template.title}`} description="This template will be hidden from the active list. Existing checklist runs are retained." onArchive={() => void archiveRecord('template', template.id, 'archive')} />}</div>}</CardContent></Card>)}</div> : <p className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">No {showArchived ? 'archived' : 'active'} checklist templates.</p>}
        </section>
        <section className="space-y-3"><div><p className="text-sm font-semibold">Checklist runs</p><p className="text-xs text-muted-foreground">{showArchived ? 'Archived completion records are retained and can be restored.' : 'These are completion records, separate from audit records.'}</p></div>
          {visibleChecklists.length ? <div className="divide-y rounded-lg border bg-background">{visibleChecklists.map((checklist) => <div key={checklist.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"><Link href={`/quality/checklists/${checklist.id}`} className="min-w-0 flex-1"><span className="block font-semibold">{checklist.title}</span><span className="text-xs text-muted-foreground">{checklist.templateTitle}</span></Link><div className="flex items-center gap-2"><span className="text-xs font-semibold">{checklist.status}</span>{canArchive && (showArchived ? <Button variant="outline" size="sm" onClick={() => void archiveRecord('run', checklist.id, 'restore')}><ArchiveRestore className="mr-1.5 h-4 w-4"/>Restore</Button> : <ArchiveActionButton srLabel={`Archive ${checklist.title}`} description="This checklist run will be retained but removed from the active list." onArchive={() => void archiveRecord('run', checklist.id, 'archive')} />)}</div></div>)}</div> : <p className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">No {showArchived ? 'archived' : 'active'} checklist runs.</p>}
        </section>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ClipboardCheck className="h-4 w-4"/>Checklists record task completion; use <Link href="/quality/audits" className="underline">Audits</Link> for findings, CAPs, and sign-off.</div>
      </CardContent>
    </Card>
  </div>;
}
