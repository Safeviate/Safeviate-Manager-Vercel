'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleCheck, CircleDotDashed, Plus, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange } from '@/types/moc';
import type { Project, ProjectPhase, ProjectTask } from '@/types/project';

const taskStatuses = ['Not Started', 'In Progress', 'Blocked', 'Done'] as const;
type Person = { id: string; firstName?: string; lastName?: string; email?: string };
const personName = (person?: Person) => `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || person?.email || 'Unassigned';

export default function ProjectWorkspace({ params }: { params: Promise<{ projectId: string }> }) {
  const { isLoading: accessLoading, isAllowed } = useTenantRouteAccess({ href: '/projects' });
  const { toast } = useToast();
  const [id, setId] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [phaseTitle, setPhaseTitle] = useState('');
  const [phaseDate, setPhaseDate] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('unassigned');
  const [taskPhase, setTaskPhase] = useState('general');

  useEffect(() => { void params.then(({ projectId }) => setId(projectId)); }, [params]);
  const load = async () => {
    if (!id) return;
    const [projectResponse, usersResponse] = await Promise.all([fetch(`/api/projects/${id}`, { cache: 'no-store' }), fetch('/api/users', { cache: 'no-store' })]);
    const payload = await projectResponse.json();
    const users = await usersResponse.json().catch(() => ({}));
    setProject(payload.project || null); setMoc(payload.moc || null); setPeople(Array.isArray(users.personnel) ? users.personnel : []);
  };
  useEffect(() => { void load(); }, [id]);
  const phases = project?.phases || [];
  const mocOpen = useMemo(() => (moc?.phases || []).flatMap((phase) => phase.steps.flatMap((step) => step.hazards.flatMap((hazard) => hazard.risks.flatMap((risk) => risk.mitigations)))).filter((mitigation) => mitigation.status !== 'Closed' && mitigation.status !== 'Cancelled'), [moc]);
  const save = async (next: Project) => {
    const response = await fetch(`/api/projects/${next.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: next }) });
    if (!response.ok) { toast({ variant: 'destructive', title: 'Unable to save project' }); return; }
    const payload = await response.json(); setProject(payload.project);
  };
  const addPhase = async () => {
    if (!project || !phaseTitle.trim()) return;
    const phase: ProjectPhase = { id: crypto.randomUUID(), title: phaseTitle.trim(), targetDate: phaseDate || undefined, status: 'Not Started' };
    await save({ ...project, phases: [...phases, phase] }); setPhaseTitle(''); setPhaseDate(''); setTaskPhase(phase.id);
  };
  const addTask = async () => {
    if (!project || !taskTitle.trim()) return;
    const task: ProjectTask = { id: crypto.randomUUID(), title: taskTitle.trim(), dueDate: taskDate || undefined, assigneeId: taskAssignee === 'unassigned' ? undefined : taskAssignee, phaseId: taskPhase === 'general' ? undefined : taskPhase, status: 'Not Started', source: 'Project' };
    await save({ ...project, tasks: [...project.tasks, task] }); setTaskTitle(''); setTaskDate(''); setTaskAssignee('unassigned');
  };
  const updateTask = (task: ProjectTask, patch: Partial<ProjectTask>) => project && void save({ ...project, tasks: project.tasks.map((current) => current.id === task.id ? { ...current, ...patch } : current) });
  const closeProject = async () => {
    if (!project) return;
    if (mocOpen.length) { toast({ variant: 'destructive', title: 'MOC controls remain open', description: 'Close or cancel all MOC mitigations before completing this project.' }); return; }
    if (project.tasks.some((task) => task.status !== 'Done')) { toast({ variant: 'destructive', title: 'Project work remains open', description: 'Complete or remove outstanding project tasks before closing.' }); return; }
    await save({ ...project, status: 'Completed' }); toast({ title: 'Project completed' });
  };

  if (!accessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (!project) return <div className="mx-auto w-full max-w-[1100px] px-1 pt-4 text-sm text-muted-foreground">Loading project…</div>;
  const done = project.tasks.filter((task) => task.status === 'Done').length;
  const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;
  const renderTask = (task: ProjectTask) => <div key={task.id} className="grid gap-3 border-t p-3 md:grid-cols-[minmax(0,1fr)_150px_180px]"><div><p className="font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.source === 'MOC Mitigation' ? 'Linked MOC mitigation' : 'Project delivery task'} · {task.dueDate ? `due ${task.dueDate}` : 'no completion date'}</p></div><Select value={task.assigneeId || 'unassigned'} onValueChange={(assigneeId) => updateTask(task, { assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId })}><SelectTrigger><SelectValue placeholder="Responsible person" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select><Select value={task.status} onValueChange={(status: ProjectTask['status']) => updateTask(task, { status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>;
  const phaseBlock = (phase: ProjectPhase | null) => {
    const tasks = project.tasks.filter((task) => phase ? task.phaseId === phase.id : !task.phaseId);
    const phaseDone = tasks.length > 0 && tasks.every((task) => task.status === 'Done');
    return <Card key={phase?.id || 'general'} className="overflow-hidden border shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-2 border-b bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{phase?.title || 'General delivery'}</p><p className="text-xs text-muted-foreground">{phase?.targetDate ? `Phase target: ${phase.targetDate}` : 'Tasks not assigned to a phase'}</p></div><Badge variant={phaseDone ? 'default' : 'secondary'}>{phaseDone ? 'Completed' : `${tasks.filter((task) => task.status !== 'Done').length} open task${tasks.filter((task) => task.status !== 'Done').length === 1 ? '' : 's'}`}</Badge></div>{tasks.length ? tasks.map(renderTask) : <p className="p-4 text-sm text-muted-foreground">No tasks in this phase.</p>}</CardContent></Card>;
  };

  return <div className="mx-auto w-full max-w-[1100px] space-y-4 px-1 pt-4"><Button asChild variant="ghost" size="sm"><Link href="/projects"><ArrowLeft className="mr-1.5 h-4 w-4"/>Back to Projects</Link></Button><Card className="overflow-hidden border shadow-none"><CardContent className="space-y-5 bg-muted/5 p-4 md:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{project.status}</p><h1 className="text-2xl font-bold">{project.name}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{project.objective}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void save({ ...project, status: project.status === 'On Hold' ? 'Active' : 'On Hold' })}>{project.status === 'On Hold' ? 'Resume' : 'Put on hold'}</Button><Button onClick={() => void closeProject()}>Complete project</Button></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Delivery progress</p><p className="mt-1 text-xl font-semibold">{progress}%</p></div><div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Open work</p><p className="mt-1 text-xl font-semibold">{project.tasks.length - done}</p></div><div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Overall completion</p><p className="mt-1 text-xl font-semibold">{project.targetDate || 'Not set'}</p></div></div><Tabs defaultValue="overview"><TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="plan">Phases & tasks</TabsTrigger><TabsTrigger value="risks">Risks & decisions</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-4"><Card className="border shadow-none"><CardContent className="p-4">{moc ? <div className="space-y-3"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600"/><div><p className="font-semibold">Management of Change control</p><p className="text-sm text-muted-foreground">{moc.mocNumber} — {moc.title}</p></div><Badge className="ml-auto">{moc.status}</Badge></div><p className={mocOpen.length ? 'flex items-center gap-2 text-sm text-amber-700' : 'flex items-center gap-2 text-sm text-emerald-700'}>{mocOpen.length ? <TriangleAlert className="h-4 w-4"/> : <CircleCheck className="h-4 w-4"/>}{mocOpen.length ? `${mocOpen.length} MOC mitigation${mocOpen.length === 1 ? '' : 's'} must close before project completion.` : 'All MOC mitigations are complete.'}</p><Button asChild variant="outline" size="sm"><Link href={`/safety/management-of-change/${moc.id}`}>Open MOC record</Link></Button></div> : <div><p className="font-semibold">Standard project</p><p className="text-sm text-muted-foreground">No Management of Change is linked. Create one if the work changes a controlled operational or safety condition.</p></div>}</CardContent></Card></TabsContent><TabsContent value="plan" className="space-y-4"><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add phase</p><div className="flex flex-col gap-2 sm:flex-row"><Input className="flex-1" value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} placeholder="Phase name, e.g. Regulatory approval" /><Input className="sm:w-44" type="date" value={phaseDate} onChange={(event) => setPhaseDate(event.target.value)} /><Button onClick={() => void addPhase()}><Plus className="mr-1.5 h-4 w-4"/>Add phase</Button></div></CardContent></Card><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add task</p><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_190px_170px_auto]"><Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Describe the task" /><Input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /><Select value={taskAssignee} onValueChange={setTaskAssignee}><SelectTrigger><SelectValue placeholder="Responsible person" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select><Select value={taskPhase} onValueChange={setTaskPhase}><SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent><SelectItem value="general">General delivery</SelectItem>{phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.title}</SelectItem>)}</SelectContent></Select><Button onClick={() => void addTask()}><Plus className="mr-1.5 h-4 w-4"/>Add</Button></div></CardContent></Card><div className="space-y-3">{phases.map((phase) => phaseBlock(phase))}{phaseBlock(null)}</div></TabsContent><TabsContent value="risks"><Card className="border shadow-none"><CardContent className="p-4 text-sm text-muted-foreground"><CircleDotDashed className="mb-2 h-5 w-5"/>Use the linked MOC risk assessment for controlled changes. A dedicated project risk and decision log is reserved for the next iteration.</CardContent></Card></TabsContent></Tabs></CardContent></Card></div>;
}
