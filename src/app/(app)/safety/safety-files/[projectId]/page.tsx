'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Eye,
  FileText,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { BackNavButton } from '@/components/back-nav-button';
import { MainPageHeader } from '@/components/page-header';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import type {
  SafetyFileAssignment,
  SafetyFileBaselineRiskAssessment,
  SafetyFileProject,
  SafetyFileProjectDocument,
  SafetyFileProjectDocumentSection,
  SafetyFileTaskRiskAssessment,
} from '@/types/safety-file';
import { SAFETY_FILE_REQUIREMENTS } from '../requirements';
import { AssignPersonnelDialog } from './assign-personnel-dialog';
import { ProjectDocumentUploader } from './project-document-uploader';
import { RiskAssessmentDialog } from './risk-assessment-dialog';

type PersonnelRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
};

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview', icon: ShieldCheck },
  { value: 'project-documents', label: 'Project Documents', icon: FileText },
  { value: 'team', label: 'Team', icon: Users },
  { value: 'risks', label: 'Risks', icon: TriangleAlert },
] as const;

const SECTION_LABELS: Record<SafetyFileProjectDocumentSection, string> = {
  'core-pack': 'Core Pack',
  appointments: 'Appointments',
  'site-controls': 'Site Controls',
  emergency: 'Emergency',
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatDisplayDate(value?: string | null, fallback = 'Not set') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, 'dd MMM yyyy');
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getProjectStatusBadge(status: SafetyFileProject['status']) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Active</Badge>;
    case 'CLOSED':
      return <Badge className="border-slate-200 bg-slate-100 text-slate-800">Closed</Badge>;
    default:
      return <Badge className="border-amber-200 bg-amber-100 text-amber-800">Planning</Badge>;
  }
}

function getDocumentHealth(expirationDate?: string | null) {
  if (!expirationDate) return 'no-expiry';
  const parsed = parseLocalDate(expirationDate);
  const expires = parsed ? parsed.getTime() : Number.NaN;
  if (Number.isNaN(expires)) return 'no-expiry';
  if (expires < Date.now()) return 'expired';
  return 'current';
}

function getDocumentHealthBadge(expirationDate?: string | null) {
  const state = getDocumentHealth(expirationDate);
  if (state === 'expired') {
    return <Badge className="border-red-200 bg-red-100 text-red-800">Expired</Badge>;
  }
  if (state === 'current') {
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Current</Badge>;
  }
  return <Badge variant="outline">No Expiry</Badge>;
}

function getRiskScoreBadge(score: number) {
  if (score > 9) return <Badge className="border-red-200 bg-red-100 text-red-800">High {score}</Badge>;
  if (score > 4) return <Badge className="border-amber-200 bg-amber-100 text-amber-800">Medium {score}</Badge>;
  return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Low {score}</Badge>;
}

function getProjectDocumentsForRequirement(
  requirementId: string,
  requirementKeywords: string[],
  documents: SafetyFileProjectDocument[]
) {
  return documents.filter((document) => {
    if (document.requirementId === requirementId) return true;
    if (document.requirementId) return false;
    const haystack = normalize(`${document.name} ${document.url}`);
    return requirementKeywords.some((keyword) => haystack.includes(normalize(keyword)));
  });
}

export default function SafetyFileProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [activeTab, setActiveTab] = useState<(typeof DETAIL_TABS)[number]['value']>('overview');
  const [project, setProject] = useState<SafetyFileProject | null>(null);
  const [assignments, setAssignments] = useState<SafetyFileAssignment[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveProject = useCallback(async (nextProject: SafetyFileProject) => {
    const response = await fetch(`/api/safety-files/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: nextProject }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to save safety file project.');
    }
    setProject(payload.project ?? nextProject);
    return payload.project ?? nextProject;
  }, [projectId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectResponse, personnelResponse] = await Promise.all([
        fetch(`/api/safety-files/${projectId}`, { cache: 'no-store' }),
        fetch('/api/personnel', { cache: 'no-store' }),
      ]);
      const [projectPayload, personnelPayload] = await Promise.all([
        projectResponse.json().catch(() => ({ project: null, assignments: [] })),
        personnelResponse.json().catch(() => ({ personnel: [] })),
      ]);
      setProject(projectPayload.project ?? null);
      setAssignments(Array.isArray(projectPayload.assignments) ? projectPayload.assignments : []);
      setPersonnel(Array.isArray(personnelPayload.personnel) ? personnelPayload.personnel : []);
    } catch {
      setProject(null);
      setAssignments([]);
      setPersonnel([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!assignments.length) {
      setSelectedPersonnelId(null);
      return;
    }
    if (!selectedPersonnelId || !assignments.some((item) => item.personnelId === selectedPersonnelId)) {
      setSelectedPersonnelId(assignments[0].personnelId);
    }
  }, [assignments, selectedPersonnelId]);

  const personnelMap = useMemo(() => new Map(personnel.map((person) => [person.id, person])), [personnel]);
  const selectedPerson = selectedPersonnelId ? personnelMap.get(selectedPersonnelId) || null : null;
  const projectDocuments = project?.projectDocuments || [];
  const baselineRisks = project?.baselineRiskAssessments || [];
  const taskRisks = project?.taskSpecificRiskAssessments || [];
  const assignedPersonnel = useMemo(() => assignments.map((assignment) => ({
    assignment,
    person: personnelMap.get(assignment.personnelId) || null,
  })), [assignments, personnelMap]);

  const overviewStats = useMemo(() => ({
    projectDocuments: projectDocuments.length,
    assignedPeople: assignedPersonnel.length,
    baselineRisks: baselineRisks.length,
    taskRisks: taskRisks.length,
    expiredWorkerDocs: assignedPersonnel.reduce((sum, row) => sum + (row.person?.documents?.filter(
      (document) => getDocumentHealth(document.expirationDate) === 'expired'
    ).length || 0), 0),
  }), [assignedPersonnel, baselineRisks.length, projectDocuments.length, taskRisks.length]);

  const projectDocumentsBySection = useMemo(() =>
    (Object.keys(SECTION_LABELS) as SafetyFileProjectDocumentSection[]).map((section) => ({
      section,
      label: SECTION_LABELS[section],
      documents: projectDocuments.filter((document) => document.section === section),
    })), [projectDocuments]);

  const requirementCoverage = useMemo(() =>
    SAFETY_FILE_REQUIREMENTS.map((requirement) => ({
      requirement,
      documents: getProjectDocumentsForRequirement(requirement.id, requirement.keywords, projectDocuments),
    })), [projectDocuments]);

  const directRequirementCoverage = useMemo(() => {
    const directItems = requirementCoverage.filter((item) => item.requirement.scope === 'direct');
    return {
      covered: directItems.filter((item) => item.documents.length > 0).length,
      total: directItems.length,
    };
  }, [requirementCoverage]);

  const nextActions = useMemo(() => {
    const actions: string[] = [];
    if (projectDocuments.length === 0) actions.push('Upload the first project document so this job has a real on-site file.');
    if (directRequirementCoverage.covered < directRequirementCoverage.total) actions.push('Fill the missing direct pack items that should already exist for this project.');
    if (assignments.length === 0) actions.push('Assign the people who will actually be working on this site.');
    if (baselineRisks.length === 0) actions.push('Record the baseline risk assessment before work starts or continues.');
    if (taskRisks.length === 0) actions.push('Add task-specific assessments for the live activities on this site.');
    return actions;
  }, [assignments.length, baselineRisks.length, directRequirementCoverage.covered, directRequirementCoverage.total, projectDocuments.length, taskRisks.length]);

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/safety-files/${projectId}/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove assignment.');
      setAssignments((current) => current.filter((assignment) => assignment.id !== assignmentId));
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddProjectDocument = async (document: SafetyFileProjectDocument) => {
    if (!project) return;
    await saveProject({
      ...project,
      projectDocuments: [document, ...(project.projectDocuments || [])],
    });
  };

  const handleDeleteProjectDocument = async (documentId: string) => {
    if (!project) return;
    await saveProject({
      ...project,
      projectDocuments: (project.projectDocuments || []).filter((document) => document.id !== documentId),
    });
  };

  const handleSaveBaselineRisk = async (assessment: SafetyFileBaselineRiskAssessment) => {
    if (!project) return;
    const current = project.baselineRiskAssessments || [];
    const exists = current.some((item) => item.id === assessment.id);
    await saveProject({
      ...project,
      baselineRiskAssessments: exists
        ? current.map((item) => (item.id === assessment.id ? assessment : item))
        : [...current, assessment],
    });
  };

  const handleDeleteBaselineRisk = async (assessmentId: string) => {
    if (!project) return;
    await saveProject({
      ...project,
      baselineRiskAssessments: (project.baselineRiskAssessments || []).filter((item) => item.id !== assessmentId),
    });
  };

  const handleSaveTaskRisk = async (assessment: SafetyFileTaskRiskAssessment) => {
    if (!project) return;
    const current = project.taskSpecificRiskAssessments || [];
    const exists = current.some((item) => item.id === assessment.id);
    await saveProject({
      ...project,
      taskSpecificRiskAssessments: exists
        ? current.map((item) => (item.id === assessment.id ? assessment : item))
        : [...current, assessment],
    });
  };

  const handleDeleteTaskRisk = async (assessmentId: string) => {
    if (!project) return;
    await saveProject({
      ...project,
      taskSpecificRiskAssessments: (project.taskSpecificRiskAssessments || []).filter((item) => item.id !== assessmentId),
    });
  };

  if (isLoading) {
    return (
<div className="mx-auto w-full max-w-[1200px] space-y-6 px-1 pt-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
<div className="mx-auto w-full max-w-[1200px] px-1 pt-8 text-center text-muted-foreground">
        Safety file project not found.
      </div>
    );
  }

  return (
<div className="mx-auto flex h-full w-full max-w-[1200px] flex-col gap-6 overflow-hidden px-1 pt-2">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as (typeof DETAIL_TABS)[number]['value'])}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="sticky top-0 z-20 bg-card">
            <MainPageHeader
              title={project.name}
              description={`${project.clientName || 'No client set'}${project.siteName ? ` | ${project.siteName}` : ''}`}
              actions={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <BackNavButton href="/safety/safety-files" text="Back to Projects" />
                  <AssignPersonnelDialog
                    projectId={projectId}
                    personnel={personnel}
                    assignedPersonnelIds={assignments.map((assignment) => assignment.personnelId)}
                    onAssigned={(assignment) => setAssignments((current) => [...current, assignment])}
                  />
                </div>
              }
            />

            <ResponsiveTabRow
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as (typeof DETAIL_TABS)[number]['value'])}
              placeholder="Select Section"
              className="shrink-0 border-b bg-muted/5 px-3 py-2"
              options={DETAIL_TABS.map((tab) => ({
                value: tab.value,
                label: tab.label,
                icon: tab.icon,
              }))}
            />
          </div>

          <CardContent className="min-h-0 flex-1 overflow-hidden bg-muted/5 p-0">
            <TabsContent value="overview" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-6 px-4 py-4 sm:px-6 sm:pb-20">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border shadow-none"><CardHeader className="space-y-1 border-b bg-background/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Project Documents</p><CardTitle className="text-2xl font-black tracking-tight">{overviewStats.projectDocuments}</CardTitle></CardHeader></Card>
                  <Card className="border shadow-none"><CardHeader className="space-y-1 border-b bg-background/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned People</p><CardTitle className="text-2xl font-black tracking-tight">{overviewStats.assignedPeople}</CardTitle></CardHeader></Card>
                  <Card className="border shadow-none"><CardHeader className="space-y-1 border-b bg-background/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Baseline Risks</p><CardTitle className="text-2xl font-black tracking-tight">{overviewStats.baselineRisks}</CardTitle></CardHeader></Card>
                  <Card className="border shadow-none"><CardHeader className="space-y-1 border-b bg-background/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Task Risks</p><CardTitle className="text-2xl font-black tracking-tight">{overviewStats.taskRisks}</CardTitle></CardHeader></Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border shadow-none">
                    <CardHeader className="space-y-2 border-b bg-background/70">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Project Snapshot</p>
                      </div>
                      <CardTitle className="text-lg font-black tracking-tight">Site and contract context</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</p><div className="mt-2">{getProjectStatusBadge(project.status)}</div></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Principal Contractor</p><p className="mt-2 text-sm font-medium">{project.principalContractor || 'Not set'}</p></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Site Address</p><p className="mt-2 text-sm font-medium">{project.siteAddress || 'Not set'}</p></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Dates</p><p className="mt-2 text-sm font-medium">{project.startDate || 'Open'}{project.endDate ? ` to ${project.endDate}` : ''}</p></div>
                      <div className="md:col-span-2"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope Of Work</p><p className="mt-2 text-sm text-muted-foreground">{project.scopeOfWork || 'No scope description has been recorded yet.'}</p></div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-none">
                    <CardHeader className="space-y-2 border-b bg-background/70">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Immediate Focus</p>
                      </div>
                      <CardTitle className="text-lg font-black tracking-tight">Practical next steps for this project file</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{directRequirementCoverage.covered} of {directRequirementCoverage.total} direct pack items covered</Badge>
                        <Badge className={overviewStats.expiredWorkerDocs > 0 ? 'border-red-200 bg-red-100 text-red-800' : 'border-emerald-200 bg-emerald-100 text-emerald-800'}>{overviewStats.expiredWorkerDocs} expired worker docs</Badge>
                      </div>
                      {nextActions.length > 0 ? nextActions.map((action) => (
                        <div key={action} className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">{action}</div>
                      )) : (
                        <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-sm text-emerald-800">The basics are in place: this project has documents, people, and risk assessments recorded.</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="project-documents" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-3 border-b bg-background/70">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Project Documents</p>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">Store the actual file contents for this site</CardTitle>
                        <p className="text-sm text-muted-foreground">Pick the file section, link it to a requirement where helpful, and upload the document directly into this project.</p>
                      </div>
                      <ProjectDocumentUploader onDocumentAdded={handleAddProjectDocument} />
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                    {projectDocumentsBySection.map((group) => (
                      <Card key={group.section} className="border shadow-none">
                        <CardHeader className="space-y-1 border-b bg-muted/5 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
                          <CardTitle className="text-2xl font-black tracking-tight">{group.documents.length}</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
                {projectDocuments.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <Card className="border shadow-none">
                      <CardHeader className="space-y-2 border-b bg-background/70">
                        <CardTitle className="text-lg font-black tracking-tight">File contents by section</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-5">
                        {projectDocumentsBySection.map((group) => (
                          <div key={group.section} className="rounded-lg border bg-background">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold">{group.label}</p>
                                <p className="text-xs text-muted-foreground">{group.documents.length} document{group.documents.length === 1 ? '' : 's'}</p>
                              </div>
                            </div>
                            <div className="space-y-3 p-4">
                              {group.documents.length > 0 ? group.documents.map((document) => {
                                const linkedRequirement = document.requirementId
                                  ? SAFETY_FILE_REQUIREMENTS.find((requirement) => requirement.id === document.requirementId)
                                  : null;
                                return (
                                  <div key={document.id} className="rounded-lg border bg-muted/5 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold">{document.name}</p>
                                        <p className="text-xs text-muted-foreground">Uploaded {formatDisplayDate(document.uploadDate)}</p>
                                        {linkedRequirement ? <Badge variant="outline" className="mt-1">{linkedRequirement.title}</Badge> : null}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {getDocumentHealthBadge(document.expirationDate || null)}
                                        <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                                          <a href={document.url}>
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                          </a>
                                        </Button>
                                        <DeleteActionButton description="This will remove the document from this project file." onDelete={() => handleDeleteProjectDocument(document.id)} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              }) : (
                                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No documents stored in this section yet.</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border shadow-none">
                      <CardHeader className="space-y-2 border-b bg-background/70">
                        <CardTitle className="text-lg font-black tracking-tight">Required pack tracker</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 p-5">
                        {requirementCoverage.map((item) => (
                          <div key={item.requirement.id} className="rounded-lg border bg-background p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold">{item.requirement.title}</p>
                                <p className="text-xs text-muted-foreground">{item.requirement.regulatoryBasis}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{SECTION_LABELS[item.requirement.section]}</Badge>
                                <Badge variant="outline">{item.requirement.scope}</Badge>
                                {item.documents.length > 0 ? (
                                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">{item.documents.length} linked</Badge>
                                ) : (
                                  <Badge className="border-amber-200 bg-amber-100 text-amber-800">Missing</Badge>
                                )}
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{item.requirement.onsiteExpectation}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.documents.length > 0 ? item.documents.map((document) => (
                                <Badge key={document.id} variant="outline">{document.name}</Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">No project document linked yet.</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border shadow-none">
                    <CardContent className="px-6 py-16 text-center">
                      <FileText className="mx-auto mb-4 h-10 w-10 opacity-25" />
                      <p className="text-lg font-semibold text-foreground">No project documents stored yet.</p>
                      <p className="mt-2 text-sm text-muted-foreground">Upload the actual file contents for this site instead of relying on generic company-document matches.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned Personnel</p>
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight">Select a user and check their current project-facing documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {assignedPersonnel.length > 0 ? (
                      <div className="space-y-3">
                        {assignedPersonnel.map(({ assignment, person }) => {
                          const documentCount = person?.documents?.length || 0;
                          const expiredCount = person?.documents?.filter((document) => getDocumentHealth(document.expirationDate) === 'expired').length || 0;
                          return (
                            <div key={assignment.id} className={`rounded-lg border p-4 transition-colors ${selectedPersonnelId === assignment.personnelId ? 'border-primary bg-primary/5' : 'bg-background'}`}>
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <button type="button" className="flex-1 text-left" onClick={() => setSelectedPersonnelId(assignment.personnelId)}>
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">{person ? `${person.firstName} ${person.lastName}` : assignment.personnelId}</p>
                                    <p className="text-xs text-muted-foreground">{assignment.siteRole}{assignment.employerName ? ` | ${assignment.employerName}` : ''}</p>
                                  </div>
                                </button>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{documentCount} docs</Badge>
                                  {expiredCount > 0 ? <Badge className="border-red-200 bg-red-100 text-red-800">{expiredCount} expired</Badge> : <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">No expired docs</Badge>}
                                  {person ? <ViewActionButton href={`/users/personnel/${person.id}`} label="Open User" /> : null}
                                  <DeleteActionButton description="This will remove the user from the project assignment list." onDelete={() => handleRemoveAssignment(assignment.id)} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed bg-background px-6 py-16 text-center">
                        <Users className="mx-auto mb-4 h-10 w-10 opacity-25" />
                        <p className="text-lg font-semibold text-foreground">No personnel assigned yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">Use the assign button in the header to link the people working on this project.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedPerson ? (
                  <Card className="border shadow-none">
                    <CardHeader className="space-y-2 border-b bg-background/70">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Selected User Documents</p>
                      </div>
                      <CardTitle className="text-lg font-black tracking-tight">{selectedPerson.firstName} {selectedPerson.lastName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5">
                      {selectedPerson.documents && selectedPerson.documents.length > 0 ? selectedPerson.documents.map((document) => (
                        <div key={`${selectedPerson.id}-${document.name}-${document.uploadDate}`} className="rounded-lg border bg-background p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{document.name}</p>
                              <p className="text-xs text-muted-foreground">Uploaded {formatDisplayDate(document.uploadDate, 'date unavailable')}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {getDocumentHealthBadge(document.expirationDate)}
                              <Badge variant="outline">{formatDisplayDate(document.expirationDate, 'No expiry')}</Badge>
                              <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                                <a href={document.url}>
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">This user currently has no uploaded documents on their profile.</div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TriangleAlert className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Baseline Risk Assessments</p>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">Project-wide hazards and baseline controls</CardTitle>
                      </div>
                      <RiskAssessmentDialog mode="baseline" personnel={personnel} onSave={handleSaveBaselineRisk} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {baselineRisks.length > 0 ? baselineRisks.map((assessment) => {
                      const responsiblePerson = assessment.responsiblePersonId ? personnelMap.get(assessment.responsiblePersonId) : null;
                      return (
                        <div key={assessment.id} className="rounded-lg border bg-background p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{assessment.hazard}</p>
                              <p className="text-sm text-muted-foreground">{assessment.riskDescription}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getRiskScoreBadge(assessment.initialAssessment.riskScore)}
                              {assessment.residualAssessment ? getRiskScoreBadge(assessment.residualAssessment.riskScore) : <Badge variant="outline">Residual pending</Badge>}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Existing Controls</p><p className="mt-1 text-sm text-muted-foreground">{assessment.existingControls || 'Not recorded'}</p></div>
                            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Additional Controls</p><p className="mt-1 text-sm text-muted-foreground">{assessment.additionalControls || 'Not recorded'}</p></div>
                          </div>
                          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <p className="text-xs text-muted-foreground">Responsible: {responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : 'Not assigned'}{assessment.reviewDate ? ` | Review ${formatDisplayDate(assessment.reviewDate)}` : ''}</p>
                            <div className="flex gap-2">
                              <RiskAssessmentDialog mode="baseline" personnel={personnel} initialValue={assessment} onSave={handleSaveBaselineRisk} />
                              <DeleteActionButton description="This will remove the baseline risk assessment from the project." onDelete={() => handleDeleteBaselineRisk(assessment.id)} />
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-xl border-2 border-dashed bg-background px-6 py-16 text-center">
                        <TriangleAlert className="mx-auto mb-4 h-10 w-10 opacity-25" />
                        <p className="text-lg font-semibold text-foreground">No baseline risks recorded yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">Add the project-level baseline assessment before work starts on site.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Task-Specific Risk Assessments</p>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">Activity-level risks for the actual work on this project</CardTitle>
                      </div>
                      <RiskAssessmentDialog mode="task" personnel={personnel} onSave={handleSaveTaskRisk} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {taskRisks.length > 0 ? taskRisks.map((assessment) => {
                      const responsiblePerson = assessment.responsiblePersonId ? personnelMap.get(assessment.responsiblePersonId) : null;
                      return (
                        <div key={assessment.id} className="rounded-lg border bg-background p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{assessment.taskName}</p>
                              <p className="text-xs text-muted-foreground">{assessment.activityDescription || 'No activity description'}</p>
                              <p className="pt-1 text-sm font-medium">{assessment.hazard}</p>
                              <p className="text-sm text-muted-foreground">{assessment.riskDescription}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getRiskScoreBadge(assessment.initialAssessment.riskScore)}
                              {assessment.residualAssessment ? getRiskScoreBadge(assessment.residualAssessment.riskScore) : <Badge variant="outline">Residual pending</Badge>}
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Controls</p>
                            <p className="mt-1 text-sm text-muted-foreground">{assessment.controls || 'Not recorded'}</p>
                          </div>
                          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <p className="text-xs text-muted-foreground">Responsible: {responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : 'Not assigned'}{assessment.reviewDate ? ` | Review ${formatDisplayDate(assessment.reviewDate)}` : ''}</p>
                            <div className="flex gap-2">
                              <RiskAssessmentDialog mode="task" personnel={personnel} initialValue={assessment} onSave={handleSaveTaskRisk} />
                              <DeleteActionButton description="This will remove the task-specific risk assessment from the project." onDelete={() => handleDeleteTaskRisk(assessment.id)} />
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-xl border-2 border-dashed bg-background px-6 py-16 text-center">
                        <ClipboardCheck className="mx-auto mb-4 h-10 w-10 opacity-25" />
                        <p className="text-lg font-semibold text-foreground">No task-specific risks recorded yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">Add activity-level assessments for work at height, lifting, excavation, hot work, confined spaces, and other live tasks.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
