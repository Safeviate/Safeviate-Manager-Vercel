'use client';

import { useMemo, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { ManagementOfChange } from '@/types/moc';
import type { Project, ProjectPhase, ProjectTask } from '@/types/project';

export function NewProjectDialog({ mocs, onCreated }: { mocs: ManagementOfChange[]; onCreated: (project: Project) => void }) {
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mocId, setMocId] = useState('none');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const availableMocs = useMemo(() => mocs.filter((moc) => moc.status !== 'Closed' && moc.status !== 'Cancelled'), [mocs]);
  const selectedMoc = availableMocs.find((moc) => moc.id === mocId);

  const create = async () => {
    if (!name.trim() || !objective.trim()) return;
    setSaving(true);
    const mocPhaseIds = new Map<string, string>();
    const phases: ProjectPhase[] = (selectedMoc?.phases || []).map((mocPhase, index) => {
      const id = crypto.randomUUID();
      mocPhaseIds.set(mocPhase.id, id);
      return { id, title: `MOC Phase ${index + 1}: ${mocPhase.title || 'Untitled phase'}`, status: 'Not Started', source: 'MOC Phase', sourceId: mocPhase.id };
    });
    const tasks: ProjectTask[] = (selectedMoc?.phases || []).flatMap((mocPhase) => mocPhase.steps.map((step) => ({
      id: crypto.randomUUID(), title: step.description || 'Untitled MOC step', status: 'Not Started', phaseId: mocPhaseIds.get(mocPhase.id), source: 'MOC Step', sourceId: step.id,
    })));
    const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: {
      name, objective, targetDate, ownerId: userProfile?.id, status: selectedMoc && (selectedMoc.status === 'Approved' || selectedMoc.status === 'In Progress') ? 'Active' : 'Planning', health: 'On Track', phases, tasks,
      mocId: selectedMoc?.id, mocNumber: selectedMoc?.mocNumber, mocTitle: selectedMoc?.title, organizationId: selectedMoc?.organizationId,
    } }) });
    setSaving(false);
    if (!response.ok) { toast({ variant: 'destructive', title: 'Unable to create project' }); return; }
    const payload = await response.json();
    onCreated(payload.project); setOpen(false); setName(''); setObjective(''); setTargetDate(''); setMocId('none');
    toast({ title: 'Project created', description: selectedMoc ? 'MOC phases and implementation steps are now linked to project delivery work.' : 'You can add milestones and delivery work next.' });
  };

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="w-full sm:w-auto"><Plus className="mr-1.5 h-4 w-4"/>New project</Button></DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New project</DialogTitle><DialogDescription>Create a delivery workspace. Link an MOC to structure the project around its approved implementation plan.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="project-name">Project name</Label><Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Aircraft induction programme" /></div><div className="grid gap-2"><Label htmlFor="project-objective">Objective</Label><Textarea id="project-objective" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="What must this project achieve?" /></div><div className="grid gap-2"><Label>Management of Change</Label><Select value={mocId} onValueChange={(value) => { setMocId(value); const moc = availableMocs.find((item) => item.id === value); if (moc && !name) setName(moc.title); if (moc && !objective) setObjective(moc.description || moc.scope); }}><SelectTrigger><SelectValue placeholder="No linked MOC" /></SelectTrigger><SelectContent><SelectItem value="none">No linked MOC</SelectItem>{availableMocs.map((moc) => <SelectItem key={moc.id} value={moc.id}>{moc.mocNumber} — {moc.title} ({moc.status})</SelectItem>)}</SelectContent></Select>{selectedMoc && <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-600"/>{selectedMoc.status === 'Approved' || selectedMoc.status === 'In Progress' ? 'MOC phases and implementation steps will be added to the project. Hazards, risks, and mitigations remain in the MOC.' : 'This MOC is still in planning. The project will be created in Planning and becomes active after MOC approval.'}</p>}</div><div className="grid gap-2"><Label htmlFor="target-date">Target completion</Label><Input id="target-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving || !name.trim() || !objective.trim()} onClick={() => void create()}>{saving ? 'Creating…' : 'Create project'}</Button></DialogFooter></DialogContent></Dialog>;
}
