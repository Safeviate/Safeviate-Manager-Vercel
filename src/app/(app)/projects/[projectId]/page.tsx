'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, CircleCheck, CircleDotDashed, Clock3, MessageSquare, Pencil, Plus, Send, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { ManagementOfChange } from '@/types/moc';
import type { Project, ProjectDiaryEntryType, ProjectMilestone, ProjectPhase, ProjectRisk, ProjectStakeholderRole, ProjectTask } from '@/types/project';

const taskStatuses = ['Not Started', 'In Progress', 'Blocked', 'Done'] as const;
type Person = { id: string; firstName?: string; lastName?: string; email?: string };
const personName = (person?: Person) => `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || person?.email || 'Unassigned';
type ProjectCompletionSettings = { defaultColor?: string; overdueColor?: string; warningPeriods?: Array<{ period: number; color: string }> };
let activeCompletionSettings: ProjectCompletionSettings = {};
const dueStatus = (dueDate?: string, status?: ProjectTask['status'], settings: ProjectCompletionSettings = activeCompletionSettings) => {
  if (!dueDate) return { label: 'No completion date', className: 'text-muted-foreground', color: '#64748b' };
  if (status === 'Done') return { label: `Completed · ${dueDate}`, className: 'text-emerald-700', color: '#22c55e' };
  const days = Math.ceil((new Date(`${dueDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`, color: settings?.overdueColor || '#ef4444', className: 'text-rose-700 font-semibold' };
  const warning = [...(settings?.warningPeriods || [{ period: 7, color: '#f59e0b' }])].sort((a, b) => a.period - b.period).find((item) => days <= item.period);
  return { label: days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} to completion`, color: warning?.color || settings?.defaultColor || '#22c55e', className: warning ? 'text-amber-700 font-semibold' : 'text-emerald-700' };
};

export default function ProjectWorkspace({ params }: { params: Promise<{ projectId: string }> }) {
  const { isLoading: accessLoading, isAllowed } = useTenantRouteAccess({ href: '/projects' });
  const { hasPermission } = usePermissions();
  const { userProfile } = useUserProfile();
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
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<ProjectRisk['level']>('Medium');
  const [stakeholderId, setStakeholderId] = useState('unassigned');
  const [stakeholderRole, setStakeholderRole] = useState<ProjectStakeholderRole>('Responsible');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [diaryTaskId, setDiaryTaskId] = useState<string | null>(null);
  const [diaryMessage, setDiaryMessage] = useState('');
  const [diaryType, setDiaryType] = useState<ProjectDiaryEntryType>('Update');
  const [isPostingDiary, setIsPostingDiary] = useState(false);
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<Set<string>>(new Set());
  const [completionSettings, setCompletionSettings] = useState<ProjectCompletionSettings>({});
  activeCompletionSettings = completionSettings;

  useEffect(() => { void params.then(({ projectId }) => setId(projectId)); }, [params]);
  const load = async () => {
    if (!id) return;
    const [projectResponse, usersResponse, configResponse] = await Promise.all([fetch(`/api/projects/${id}`, { cache: 'no-store' }), fetch('/api/users', { cache: 'no-store' }), fetch('/api/tenant-config', { cache: 'no-store' })]);
    const payload = await projectResponse.json();
    const users = await usersResponse.json().catch(() => ({}));
    const config = await configResponse.json().catch(() => ({}));
    setProject(payload.project || null); setMoc(payload.moc || null); setPeople(Array.isArray(users.personnel) ? users.personnel : []); setCompletionSettings(config?.config?.['project-completion-alerts'] || {});
  };
  useEffect(() => { void load(); }, [id]);
  const phases = project?.phases || [];
  const canEditProject = hasPermission('projects-edit');
  const canDeleteProjectItems = hasPermission('projects-delete');
  const mocOpen = useMemo(() => (moc?.phases || []).flatMap((phase) => phase.steps.flatMap((step) => step.hazards.flatMap((hazard) => hazard.risks.flatMap((risk) => risk.mitigations)))).filter((mitigation) => mitigation.status !== 'Closed' && mitigation.status !== 'Cancelled'), [moc]);
  const save = async (next: Project) => {
    const response = await fetch(`/api/projects/${next.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: next }) });
    if (!response.ok) { toast({ variant: 'destructive', title: 'Unable to save project' }); return; }
    const payload = await response.json(); setProject(payload.project);
  };
  const addPhase = async () => {
    if (!canEditProject) return;
    if (!project || !phaseTitle.trim()) return;
    const phase: ProjectPhase = { id: crypto.randomUUID(), title: phaseTitle.trim(), targetDate: phaseDate || undefined, status: 'Not Started' };
    await save({ ...project, phases: [...phases, phase] }); setPhaseTitle(''); setPhaseDate(''); setTaskPhase(phase.id);
  };
  const addTask = async () => {
    if (!canEditProject) return;
    if (!project || !taskTitle.trim()) return;
    const task: ProjectTask = { id: crypto.randomUUID(), title: taskTitle.trim(), dueDate: taskDate || undefined, assigneeId: taskAssignee === 'unassigned' ? undefined : taskAssignee, phaseId: taskPhase === 'general' ? undefined : taskPhase, status: 'Not Started', source: 'Project' };
    await save({ ...project, tasks: [...project.tasks, task] }); setTaskTitle(''); setTaskDate(''); setTaskAssignee('unassigned');
  };
  const updateTask = (task: ProjectTask, patch: Partial<ProjectTask>) => canEditProject && project && void save({ ...project, tasks: project.tasks.map((current) => current.id === task.id ? { ...current, ...patch } : current) });
  const updatePhase = (phase: ProjectPhase, patch: Partial<ProjectPhase>) => canEditProject && project && void save({ ...project, phases: phases.map((current) => current.id === phase.id ? { ...current, ...patch } : current) });
  const deleteTask = (taskId: string) => canDeleteProjectItems && project && void save({ ...project, tasks: project.tasks.filter((task) => task.id !== taskId) });
  const deletePhase = (phaseId: string) => canDeleteProjectItems && project && void save({ ...project, phases: phases.filter((phase) => phase.id !== phaseId), tasks: project.tasks.map((task) => task.phaseId === phaseId ? { ...task, phaseId: undefined } : task) });
  const addMilestone = async () => {
    if (!canEditProject || !project || !milestoneTitle.trim()) return;
    const milestone: ProjectMilestone = { id: crypto.randomUUID(), title: milestoneTitle.trim(), dueDate: milestoneDate || undefined, complete: false };
    await save({ ...project, milestones: [...project.milestones, milestone] }); setMilestoneTitle(''); setMilestoneDate('');
  };
  const updateMilestone = (milestone: ProjectMilestone, patch: Partial<ProjectMilestone>) => canEditProject && project && void save({ ...project, milestones: project.milestones.map((item) => item.id === milestone.id ? { ...item, ...patch } : item) });
  const addRisk = async () => {
    if (!canEditProject || !project || !riskDescription.trim()) return;
    const risk: ProjectRisk = { id: crypto.randomUUID(), description: riskDescription.trim(), level: riskLevel, status: 'Open' };
    await save({ ...project, risks: [...project.risks, risk] }); setRiskDescription(''); setRiskLevel('Medium');
  };
  const updateRisk = (risk: ProjectRisk, patch: Partial<ProjectRisk>) => canEditProject && project && void save({ ...project, risks: project.risks.map((item) => item.id === risk.id ? { ...item, ...patch } : item) });
  const assignStakeholder = () => {
    if (!canEditProject || !project || stakeholderId === 'unassigned') return;
    const existing = project.stakeholders || [];
    const next = [...existing.filter((item) => item.personId !== stakeholderId), { personId: stakeholderId, role: stakeholderRole }];
    void save({ ...project, stakeholders: next }); setStakeholderId('unassigned');
  };
  const removeStakeholder = (personId: string) => canEditProject && project && void save({ ...project, stakeholders: (project.stakeholders || []).filter((item) => item.personId !== personId) });
  const editTask = (task: ProjectTask) => setEditingTaskId(task.id);
  const editPhase = (phase: ProjectPhase) => setEditingPhaseId(phase.id);
  const postDiaryEntry = async (task: ProjectTask) => {
    if (!canEditProject || !project || !userProfile || !diaryMessage.trim() || isPostingDiary) return;
    setIsPostingDiary(true);
    const entry = {
      id: crypto.randomUUID(),
      type: diaryType,
      message: diaryMessage.trim(),
      authorId: userProfile.id,
      authorName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email || 'User',
      createdAt: new Date().toISOString(),
      status: task.status,
    } satisfies NonNullable<ProjectTask['diary']>[number];
    await save({ ...project, tasks: project.tasks.map((current) => current.id === task.id ? { ...current, diary: [...(current.diary || []), entry] } : current) });
    setDiaryMessage('');
    setDiaryType('Update');
    setIsPostingDiary(false);
  };
  const closeProject = async () => {
    if (!project) return;
    if (mocOpen.length) { toast({ variant: 'destructive', title: 'MOC controls remain open', description: 'Close or cancel all MOC mitigations before completing this project.' }); return; }
    if (project.tasks.some((task) => task.status !== 'Done')) { toast({ variant: 'destructive', title: 'Project work remains open', description: 'Complete or remove outstanding project tasks before closing.' }); return; }
    if (project.risks.some((risk) => risk.status !== 'Closed')) { toast({ variant: 'destructive', title: 'Project risks remain open', description: 'Close the project risk register before completing this project.' }); return; }
    await save({ ...project, status: 'Completed' }); toast({ title: 'Project completed' });
  };

  if (!accessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (!project) return <div className="mx-auto w-full max-w-[1100px] px-1 pt-4 text-sm text-muted-foreground">Loading project…</div>;
  const done = project.tasks.filter((task) => task.status === 'Done').length;
  const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;
  const completedMilestones = project.milestones.filter((milestone) => milestone.complete).length;
  const openRisks = project.risks.filter((risk) => risk.status !== 'Closed').length;
  const stakeholders = project.stakeholders || [];
  const renderTask = (task: ProjectTask, workBreakdownCode: string) => { const due = dueStatus(task.dueDate, task.status); const diaryOpen = diaryTaskId === task.id; return <div key={task.id} className="border-t"><div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_150px_180px_auto]"><div>{editingTaskId === task.id ? <div className="flex max-w-lg gap-2"><Input autoFocus defaultValue={task.title} className="h-8 font-medium" onBlur={(event) => { if (event.target.value.trim() && event.target.value !== task.title) updateTask(task, { title: event.target.value.trim() }); }} /><Input type="date" defaultValue={task.dueDate || ''} className="h-8 w-40" onBlur={(event) => { if (event.target.value !== (task.dueDate || '')) updateTask(task, { dueDate: event.target.value || undefined }); setEditingTaskId(null); }} /></div> : <p className="font-medium"><span className="mr-2 text-xs font-bold tabular-nums text-muted-foreground">{workBreakdownCode}</span>{task.title}</p>}<p className={`text-xs ${due.className}`} style={{ color: due.color }}>{due.label}</p></div><Select disabled={!canEditProject} value={task.assigneeId || 'unassigned'} onValueChange={(assigneeId) => updateTask(task, { assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId })}><SelectTrigger><SelectValue placeholder="Responsible person" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select><Select disabled={!canEditProject} value={task.status} onValueChange={(status: ProjectTask['status']) => updateTask(task, { status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><div className="flex items-center gap-1">{canEditProject ? <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setDiaryTaskId(diaryOpen ? null : task.id)} aria-label={`Open diary for ${task.title}`}><MessageSquare className="h-4 w-4" />Diary{task.diary?.length ? ` (${task.diary.length})` : ''}</Button> : null}{canEditProject ? <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => editTask(task)} aria-label={`Edit ${task.title}`}><Pencil className="h-4 w-4" /></Button> : null}{canDeleteProjectItems ? <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 className="h-4 w-4" /></Button> : null}</div></div>{diaryOpen ? <div className="border-t bg-muted/5 p-4 md:ml-4"><div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Task diary</p><span className="text-xs text-muted-foreground">{task.diary?.length || 0} entr{task.diary?.length === 1 ? 'y' : 'ies'}</span></div><div className="max-h-64 space-y-3 overflow-y-auto">{task.diary?.length ? [...task.diary].reverse().map((entry) => <div key={entry.id} className="rounded-lg border bg-background p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{entry.type}</Badge><span className="text-xs font-medium">{entry.authorName}</span><span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{entry.message}</p>{entry.status ? <p className="mt-1 text-xs text-muted-foreground">Status at entry: {entry.status}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No diary entries yet. Record the first update below.</p>}</div><div className="mt-4 flex flex-col gap-2 md:flex-row"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={diaryType} onChange={(event) => setDiaryType(event.target.value as ProjectDiaryEntryType)}><option value="Update">Update</option><option value="Comment">Comment</option><option value="Blocker">Blocker</option><option value="Decision">Decision</option><option value="Completion">Completion</option></select><Input value={diaryMessage} onChange={(event) => setDiaryMessage(event.target.value)} placeholder="Record progress, a blocker, decision, or comment..." onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void postDiaryEntry(task); }} /><Button disabled={!diaryMessage.trim() || isPostingDiary} onClick={() => void postDiaryEntry(task)}><Send className="mr-1.5 h-4 w-4" />{isPostingDiary ? 'Saving...' : 'Add entry'}</Button></div><p className="mt-2 text-xs text-muted-foreground">Ctrl + Enter to save. Each entry records the task status at the time it was written.</p></div> : null}</div>; };
  const phaseBlock = (phase: ProjectPhase | null, phaseIndex?: number) => {
    const tasks = project.tasks.filter((task) => phase ? task.phaseId === phase.id : !task.phaseId);
    const phaseDone = tasks.length > 0 && tasks.every((task) => task.status === 'Done');
    const phaseNumber = phaseIndex === undefined ? undefined : String(phaseIndex + 1);
    const phaseKey = phase?.id || 'general';
    const collapsed = collapsedPhaseIds.has(phaseKey);
    const togglePhase = () => setCollapsedPhaseIds((current) => { const next = new Set(current); if (next.has(phaseKey)) next.delete(phaseKey); else next.add(phaseKey); return next; });
    return <Card key={phaseKey} className="overflow-hidden border shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-2 border-b bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={togglePhase} aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${phase?.title || 'Unassigned tasks'}`} aria-expanded={!collapsed}><ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} /></Button><div className="min-w-0">{phase && editingPhaseId === phase.id ? <Input autoFocus defaultValue={phase.title} className="h-8 max-w-md font-semibold" onBlur={(event) => { if (event.target.value.trim() && event.target.value !== phase.title) updatePhase(phase, { title: event.target.value.trim() }); setEditingPhaseId(null); }} onKeyDown={(event) => { if (event.key === 'Escape') setEditingPhaseId(null); }} /> : <p className="font-semibold">{phaseNumber && <span className="mr-2 text-xs font-bold tabular-nums text-muted-foreground">{phaseNumber}</span>}{phase?.title || 'Unassigned tasks'}</p>}<p className="text-xs text-muted-foreground">{phase?.targetDate ? `Phase target: ${phase.targetDate}` : 'Tasks not assigned to a phase'}</p></div></div><div className="flex items-center gap-2 pl-9 sm:pl-0"><Badge variant={phaseDone ? 'default' : 'secondary'}>{phaseDone ? 'Completed' : `${tasks.filter((task) => task.status !== 'Done').length} open task${tasks.filter((task) => task.status !== 'Done').length === 1 ? '' : 's'}`}</Badge>{phase && canEditProject ? <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => editPhase(phase)} aria-label={`Edit ${phase.title}`}><Pencil className="h-4 w-4" /></Button> : null}{phase && canDeleteProjectItems ? <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deletePhase(phase.id)} aria-label={`Delete ${phase.title}`}><Trash2 className="h-4 w-4" /></Button> : null}</div></div>{!collapsed ? (tasks.length ? tasks.map((task, taskIndex) => renderTask(task, phaseNumber ? `${phaseNumber}.${taskIndex + 1}` : `U.${taskIndex + 1}`)) : <p className="p-4 text-sm text-muted-foreground">No tasks are currently unassigned to a phase.</p>) : null}</CardContent></Card>;
  };

  const stakeholderPanel = <Card className="border shadow-none"><CardContent className="space-y-3 p-4"><div><p className="font-semibold">Project people & communications</p><p className="text-sm text-muted-foreground">Set accountability and who must be consulted or kept informed.</p></div><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]"><Select value={stakeholderId} onValueChange={setStakeholderId}><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Select person</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select><Select value={stakeholderRole} onValueChange={(value) => setStakeholderRole(value as ProjectStakeholderRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(['Accountable', 'Responsible', 'Consulted', 'Informed'] as const).map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select><Button disabled={!canEditProject || stakeholderId === 'unassigned'} onClick={assignStakeholder}>Assign</Button></div><div className="grid gap-2 sm:grid-cols-2">{stakeholders.length ? stakeholders.map((stakeholder) => <div key={stakeholder.personId} className="flex items-center justify-between gap-2 rounded border px-3 py-2"><div><p className="text-sm font-medium">{personName(people.find((person) => person.id === stakeholder.personId))}</p><Badge variant="outline" className="mt-1">{stakeholder.role}</Badge></div>{canEditProject && <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeStakeholder(stakeholder.personId)}>Remove</Button>}</div>) : <p className="text-sm text-muted-foreground">No project people assigned yet.</p>}</div></CardContent></Card>;
  return <div className="mx-auto w-full max-w-[1100px] space-y-4 px-1 pt-4"><Button asChild variant="ghost" size="sm"><Link href="/projects"><ArrowLeft className="mr-1.5 h-4 w-4"/>Back to Projects</Link></Button><Card className="overflow-hidden border shadow-none"><CardContent className="space-y-5 bg-muted/5 p-4 md:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{project.status}</p><h1 className="text-2xl font-bold">{project.name}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{project.objective}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void save({ ...project, status: project.status === 'On Hold' ? 'Active' : 'On Hold' })}>{project.status === 'On Hold' ? 'Resume' : 'Put on hold'}</Button><Button onClick={() => void closeProject()}>Complete project</Button></div></div><div className="grid gap-3 sm:grid-cols-4"><Metric label="Delivery progress" value={`${progress}%`} /><Metric label="Open work" value={String(project.tasks.length - done)} /><Metric label="Milestones" value={`${completedMilestones}/${project.milestones.length}`} /><Metric label="Open risks" value={String(openRisks)} /></div><Tabs defaultValue="overview"><TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="people">People</TabsTrigger><TabsTrigger value="plan">Phases & tasks</TabsTrigger><TabsTrigger value="milestones">Milestones</TabsTrigger><TabsTrigger value="risks">Risks</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-4">{stakeholderPanel}<Card className="border shadow-none"><CardContent className="p-4">{moc ? <div className="space-y-3"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600"/><div><p className="font-semibold">Management of Change control</p><p className="text-sm text-muted-foreground">{moc.mocNumber} — {moc.title}</p></div><Badge className="ml-auto">{moc.status}</Badge></div><p className={mocOpen.length ? 'flex items-center gap-2 text-sm text-amber-700' : 'flex items-center gap-2 text-sm text-emerald-700'}>{mocOpen.length ? <TriangleAlert className="h-4 w-4"/> : <CircleCheck className="h-4 w-4"/>}{mocOpen.length ? `${mocOpen.length} MOC mitigation${mocOpen.length === 1 ? '' : 's'} must close before project completion.` : 'All MOC mitigations are complete.'}</p><Button asChild variant="outline" size="sm"><Link href={`/safety/management-of-change/${moc.id}`}>Open MOC record</Link></Button></div> : <div><p className="font-semibold">Standard project</p><p className="text-sm text-muted-foreground">No Management of Change is linked. Create one if the work changes a controlled operational or safety condition.</p></div>}</CardContent></Card></TabsContent><TabsContent value="people">{stakeholderPanel}</TabsContent><TabsContent value="plan" className="space-y-4"><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add phase</p><div className="flex flex-col gap-2 sm:flex-row"><Input className="flex-1" value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} placeholder="Phase name, e.g. Regulatory approval" /><Input className="sm:w-44" type="date" value={phaseDate} onChange={(event) => setPhaseDate(event.target.value)} /><Button onClick={() => void addPhase()}><Plus className="mr-1.5 h-4 w-4"/>Add phase</Button></div></CardContent></Card><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add task</p><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_190px_170px_auto]"><Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Describe the task" /><Input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /><Select value={taskAssignee} onValueChange={setTaskAssignee}><SelectTrigger><SelectValue placeholder="Responsible person" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select><Select value={taskPhase} onValueChange={setTaskPhase}><SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent><SelectItem value="general">General delivery</SelectItem>{phases.map((phase, phaseIndex) => <SelectItem key={phase.id} value={phase.id}>{phaseIndex + 1}. {phase.title}</SelectItem>)}</SelectContent></Select><Button onClick={() => void addTask()}><Plus className="mr-1.5 h-4 w-4"/>Add</Button></div></CardContent></Card><div className="space-y-3">{phases.map((phase, phaseIndex) => phaseBlock(phase, phaseIndex))}{phaseBlock(null)}</div></TabsContent><TabsContent value="milestones" className="space-y-4"><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add milestone</p><div className="flex flex-col gap-2 sm:flex-row"><Input className="flex-1" value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Milestone, approval, or delivery gate" /><Input className="sm:w-44" type="date" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} /><Button onClick={() => void addMilestone()}><Plus className="mr-1.5 h-4 w-4"/>Add</Button></div></CardContent></Card><Card className="border shadow-none"><CardContent className="divide-y p-0">{project.milestones.length ? project.milestones.map((milestone) => <div key={milestone.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{milestone.title}</p><p className="text-xs text-muted-foreground">{milestone.dueDate || 'No target date'}</p></div><Button disabled={!canEditProject} variant={milestone.complete ? 'default' : 'outline'} size="sm" onClick={() => updateMilestone(milestone, { complete: !milestone.complete })}>{milestone.complete ? 'Completed' : 'Mark complete'}</Button></div>) : <p className="p-4 text-sm text-muted-foreground">No milestones recorded yet.</p>}</CardContent></Card></TabsContent><TabsContent value="risks" className="space-y-4"><Card className="border shadow-none"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">Add project risk</p><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_auto]"><Input value={riskDescription} onChange={(event) => setRiskDescription(event.target.value)} placeholder="Describe a delivery risk, dependency, or issue" /><Select value={riskLevel} onValueChange={(value) => setRiskLevel(value as ProjectRisk['level'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(['Low', 'Medium', 'High', 'Critical'] as const).map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><Button onClick={() => void addRisk()}><Plus className="mr-1.5 h-4 w-4"/>Add risk</Button></div></CardContent></Card><Card className="border shadow-none"><CardContent className="divide-y p-0">{project.risks.length ? project.risks.map((risk) => <div key={risk.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_140px_170px]"><div><p className="font-medium">{risk.description}</p><Badge className="mt-2" variant={risk.level === 'Critical' || risk.level === 'High' ? 'destructive' : 'outline'}>{risk.level}</Badge></div><Select disabled={!canEditProject} value={risk.status} onValueChange={(status: ProjectRisk['status']) => updateRisk(risk, { status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="Mitigating">Mitigating</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select><p className="self-center text-sm text-muted-foreground">Project risk register</p></div>) : <p className="p-4 text-sm text-muted-foreground">No project risks recorded. Controlled-change hazards remain in the linked MOC.</p>}</CardContent></Card></TabsContent></Tabs></CardContent></Card></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
