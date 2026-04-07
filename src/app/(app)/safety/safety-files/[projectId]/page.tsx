'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MainPageHeader } from '@/components/page-header';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import type {
  SafetyFileAssignment,
  SafetyFileBaselineRiskAssessment,
  SafetyFileProject,
  SafetyFileTaskRiskAssessment,
} from '@/types/safety-file';
import { SAFETY_FILE_REQUIREMENTS } from '../requirements';
import { AssignPersonnelDialog } from './assign-personnel-dialog';
import { RiskAssessmentDialog } from './risk-assessment-dialog';

type ProjectDocument = {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  expirationDate: string | null;
};

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
  { value: 'site-pack', label: 'Site Pack', icon: FileText },
  { value: 'baseline-risks', label: 'Baseline Risks', icon: TriangleAlert },
  { value: 'task-risks', label: 'Task Risks', icon: ClipboardCheck },
  { value: 'team', label: 'Team', icon: Users },
  { value: 'compliance', label: 'Compliance', icon: ClipboardCheck },
] as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
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
  const expires = new Date(expirationDate).getTime();
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

function getMatchesForRequirement(requirementKeywords: string[], documents: ProjectDocument[]) {
  return documents.filter((document) => {
    const haystack = normalize(`${document.name} ${document.url}`);
    return requirementKeywords.some((keyword) => haystack.includes(normalize(keyword)));
  });
}

function getRiskScoreBadge(score: number) {
  if (score > 9) {
    return <Badge className="border-red-200 bg-red-100 text-red-800">High {score}</Badge>;
  }
  if (score > 4) {
    return <Badge className="border-amber-200 bg-amber-100 text-amber-800">Medium {score}</Badge>;
  }
  return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Low {score}</Badge>;
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
  const [companyDocuments, setCompanyDocuments] = useState<ProjectDocument[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveProject = useCallback(
    async (nextProject: SafetyFileProject) => {
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
    },
    [projectId]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectResponse, personnelResponse, documentsResponse] = await Promise.all([
        fetch(`/api/safety-files/${projectId}`, { cache: 'no-store' }),
        fetch('/api/personnel', { cache: 'no-store' }),
        fetch('/api/company-documents', { cache: 'no-store' }),
      ]);

      const [projectPayload, personnelPayload, documentsPayload] = await Promise.all([
        projectResponse.json().catch(() => ({ project: null, assignments: [] })),
        personnelResponse.json().catch(() => ({ personnel: [] })),
        documentsResponse.json().catch(() => ({ documents: [] })),
      ]);

      setProject(projectPayload.project ?? null);
      setAssignments(Array.isArray(projectPayload.assignments) ? projectPayload.assignments : []);
      setPersonnel(Array.isArray(personnelPayload.personnel) ? personnelPayload.personnel : []);
      setCompanyDocuments(Array.isArray(documentsPayload.documents) ? documentsPayload.documents : []);
    } catch {
      setProject(null);
      setAssignments([]);
      setPersonnel([]);
      setCompanyDocuments([]);
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

    if (!selectedPersonnelId || !assignments.some((assignment) => assignment.personnelId === selectedPersonnelId)) {
      setSelectedPersonnelId(assignments[0].personnelId);
    }
  }, [assignments, selectedPersonnelId]);

  const personnelMap = useMemo(
    () => new Map(personnel.map((person) => [person.id, person])),
    [personnel]
  );

  const selectedPerson = selectedPersonnelId ? personnelMap.get(selectedPersonnelId) || null : null;

  const assignedPersonnel = useMemo(
    () =>
      assignments.map((assignment) => ({
        assignment,
        person: personnelMap.get(assignment.personnelId) || null,
      })),
    [assignments, personnelMap]
  );

  const complianceSummary = useMemo(() => {
    const totalAssigned = assignedPersonnel.length;
    const totalDocuments = assignedPersonnel.reduce(
      (sum, row) => sum + (row.person?.documents?.length || 0),
      0
    );
    const expiredDocuments = assignedPersonnel.reduce(
      (sum, row) =>
        sum +
        (row.person?.documents?.filter((document) => getDocumentHealth(document.expirationDate) === 'expired')
          .length || 0),
      0
    );

    return {
      totalAssigned,
      totalDocuments,
      expiredDocuments,
    };
  }, [assignedPersonnel]);

  const sitePackMatches = useMemo(
    () =>
      SAFETY_FILE_REQUIREMENTS.map((requirement) => ({
        requirement,
        matches: getMatchesForRequirement(requirement.keywords, companyDocuments),
      })),
    [companyDocuments]
  );

  const directSitePackCoverage = useMemo(() => {
    const direct = sitePackMatches.filter((item) => item.requirement.scope === 'direct');
    const matched = direct.filter((item) => item.matches.length > 0).length;
    return {
      matched,
      total: direct.length,
    };
  }, [sitePackMatches]);

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/safety-files/${projectId}/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove assignment.');
      }
      setAssignments((current) => current.filter((assignment) => assignment.id !== assignmentId));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveBaselineRisk = async (assessment: SafetyFileBaselineRiskAssessment) => {
    if (!project) return;
    const current = project.baselineRiskAssessments || [];
    const exists = current.some((item) => item.id === assessment.id);
    const nextProject: SafetyFileProject = {
      ...project,
      baselineRiskAssessments: exists
        ? current.map((item) => (item.id === assessment.id ? assessment : item))
        : [...current, assessment],
    };
    await saveProject(nextProject);
  };

  const handleDeleteBaselineRisk = async (assessmentId: string) => {
    if (!project) return;
    const nextProject: SafetyFileProject = {
      ...project,
      baselineRiskAssessments: (project.baselineRiskAssessments || []).filter(
        (item) => item.id !== assessmentId
      ),
    };
    await saveProject(nextProject);
  };

  const handleSaveTaskRisk = async (assessment: SafetyFileTaskRiskAssessment) => {
    if (!project) return;
    const current = project.taskSpecificRiskAssessments || [];
    const exists = current.some((item) => item.id === assessment.id);
    const nextProject: SafetyFileProject = {
      ...project,
      taskSpecificRiskAssessments: exists
        ? current.map((item) => (item.id === assessment.id ? assessment : item))
        : [...current, assessment],
    };
    await saveProject(nextProject);
  };

  const handleDeleteTaskRisk = async (assessmentId: string) => {
    if (!project) return;
    const nextProject: SafetyFileProject = {
      ...project,
      taskSpecificRiskAssessments: (project.taskSpecificRiskAssessments || []).filter(
        (item) => item.id !== assessmentId
      ),
    };
    await saveProject(nextProject);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-1 pt-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-1 pt-8 text-center text-muted-foreground">
        Safety file project not found.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-6 overflow-hidden px-1 pt-2">
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
                  <Button asChild variant="outline" className="h-9 gap-2 px-4 text-[10px] font-black uppercase tracking-widest">
                    <Link href="/safety/safety-files">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back To Projects
                    </Link>
                  </Button>
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
              className="border-b bg-muted/5 px-6 py-3 shrink-0"
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
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                        <div className="mt-2">{getProjectStatusBadge(project.status)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Principal Contractor</p>
                        <p className="mt-2 text-sm font-medium">{project.principalContractor || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Site Address</p>
                        <p className="mt-2 text-sm font-medium">{project.siteAddress || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Dates</p>
                        <p className="mt-2 text-sm font-medium">
                          {project.startDate || 'Open'}{project.endDate ? ` to ${project.endDate}` : ''}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope Of Work</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {project.scopeOfWork || 'No scope description has been recorded yet.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                    <Card className="border shadow-none">
                      <CardHeader className="space-y-1 border-b bg-background/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned People</p>
                        <CardTitle className="text-2xl font-black tracking-tight">{complianceSummary.totalAssigned}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border shadow-none">
                      <CardHeader className="space-y-1 border-b bg-background/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Linked Worker Docs</p>
                        <CardTitle className="text-2xl font-black tracking-tight">{complianceSummary.totalDocuments}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="border shadow-none">
                      <CardHeader className="space-y-1 border-b bg-background/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expired Worker Docs</p>
                        <CardTitle className="text-2xl font-black tracking-tight">{complianceSummary.expiredDocuments}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Why This Matters</p>
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight">The site file must reflect the people actually on the job</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                    <p>
                      This project is the compliance container for one site or contract. The assigned
                      personnel list should match who is actually working under this project, because that
                      is what makes the linked document view meaningful during site inspection or audit.
                    </p>
                    <p>
                      Worker documents remain owned by each personnel profile. This screen links those
                      existing records into project context, so you can see which workers are assigned and
                      what document evidence they currently carry.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="site-pack" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Site Pack Coverage</p>
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight">
                      {directSitePackCoverage.matched} of {directSitePackCoverage.total} direct regulation-linked pack items have company document matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {sitePackMatches.map((item) => (
                      <div key={item.requirement.id} className="rounded-lg border bg-background p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{item.requirement.title}</p>
                            <p className="text-xs text-muted-foreground">{item.requirement.regulatoryBasis}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{item.requirement.scope}</Badge>
                            {item.matches.length > 0 ? (
                              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                                {item.matches.length} match{item.matches.length === 1 ? '' : 'es'}
                              </Badge>
                            ) : (
                              <Badge className="border-amber-200 bg-amber-100 text-amber-800">No match</Badge>
                            )}
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{item.requirement.onsiteExpectation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="baseline-risks" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TriangleAlert className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Baseline Risk Assessment</p>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">
                          Project-wide hazards before task execution
                        </CardTitle>
                      </div>
                      <RiskAssessmentDialog
                        mode="baseline"
                        personnel={personnel}
                        onSave={handleSaveBaselineRisk}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {(project.baselineRiskAssessments || []).length > 0 ? (
                      (project.baselineRiskAssessments || []).map((assessment) => {
                        const responsiblePerson = assessment.responsiblePersonId
                          ? personnelMap.get(assessment.responsiblePersonId)
                          : null;
                        return (
                          <div key={assessment.id} className="rounded-lg border bg-background p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">{assessment.hazard}</p>
                                <p className="text-sm text-muted-foreground">{assessment.riskDescription}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getRiskScoreBadge(assessment.initialAssessment.riskScore)}
                                {assessment.residualAssessment
                                  ? getRiskScoreBadge(assessment.residualAssessment.riskScore)
                                  : <Badge variant="outline">Residual pending</Badge>}
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Existing Controls</p>
                                <p className="mt-1 text-sm text-muted-foreground">{assessment.existingControls || 'Not recorded'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Additional Controls</p>
                                <p className="mt-1 text-sm text-muted-foreground">{assessment.additionalControls || 'Not recorded'}</p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <p className="text-xs text-muted-foreground">
                                Responsible: {responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : 'Not assigned'}
                                {assessment.reviewDate ? ` | Review ${format(new Date(assessment.reviewDate), 'dd MMM yyyy')}` : ''}
                              </p>
                              <div className="flex gap-2">
                                <RiskAssessmentDialog
                                  mode="baseline"
                                  personnel={personnel}
                                  initialValue={assessment}
                                  onSave={handleSaveBaselineRisk}
                                />
                                <DeleteActionButton
                                  description="This will remove the baseline risk assessment from the project."
                                  onDelete={() => handleDeleteBaselineRisk(assessment.id)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border-2 border-dashed bg-background px-6 py-16 text-center">
                        <TriangleAlert className="mx-auto mb-4 h-10 w-10 opacity-25" />
                        <p className="text-lg font-semibold text-foreground">No baseline risks recorded yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Add the project-level baseline assessment before work starts on site.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="task-risks" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                <Card className="border shadow-none">
                  <CardHeader className="space-y-2 border-b bg-background/70">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Task-Specific Risk Assessments</p>
                        </div>
                        <CardTitle className="text-lg font-black tracking-tight">
                          Activity-level risks for jobs performed on this project
                        </CardTitle>
                      </div>
                      <RiskAssessmentDialog
                        mode="task"
                        personnel={personnel}
                        onSave={handleSaveTaskRisk}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {(project.taskSpecificRiskAssessments || []).length > 0 ? (
                      (project.taskSpecificRiskAssessments || []).map((assessment) => {
                        const responsiblePerson = assessment.responsiblePersonId
                          ? personnelMap.get(assessment.responsiblePersonId)
                          : null;
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
                                {assessment.residualAssessment
                                  ? getRiskScoreBadge(assessment.residualAssessment.riskScore)
                                  : <Badge variant="outline">Residual pending</Badge>}
                              </div>
                            </div>
                            <div className="mt-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Controls</p>
                              <p className="mt-1 text-sm text-muted-foreground">{assessment.controls || 'Not recorded'}</p>
                            </div>
                            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <p className="text-xs text-muted-foreground">
                                Responsible: {responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : 'Not assigned'}
                                {assessment.reviewDate ? ` | Review ${format(new Date(assessment.reviewDate), 'dd MMM yyyy')}` : ''}
                              </p>
                              <div className="flex gap-2">
                                <RiskAssessmentDialog
                                  mode="task"
                                  personnel={personnel}
                                  initialValue={assessment}
                                  onSave={handleSaveTaskRisk}
                                />
                                <DeleteActionButton
                                  description="This will remove the task-specific risk assessment from the project."
                                  onDelete={() => handleDeleteTaskRisk(assessment.id)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border-2 border-dashed bg-background px-6 py-16 text-center">
                        <ClipboardCheck className="mx-auto mb-4 h-10 w-10 opacity-25" />
                        <p className="text-lg font-semibold text-foreground">No task-specific risks recorded yet.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Add a task-level assessment for activities like work at height, lifting, excavation, hot work, or confined entry.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                    <CardTitle className="text-lg font-black tracking-tight">Select a user and review their current documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {assignedPersonnel.length > 0 ? (
                      <div className="space-y-3">
                        {assignedPersonnel.map(({ assignment, person }) => {
                          const documentCount = person?.documents?.length || 0;
                          const expiredCount = person?.documents?.filter(
                            (document) => getDocumentHealth(document.expirationDate) === 'expired'
                          ).length || 0;

                          return (
                            <div
                              key={assignment.id}
                              className={`rounded-lg border p-4 transition-colors ${
                                selectedPersonnelId === assignment.personnelId ? 'border-primary bg-primary/5' : 'bg-background'
                              }`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <button
                                  type="button"
                                  className="flex-1 text-left"
                                  onClick={() => setSelectedPersonnelId(assignment.personnelId)}
                                >
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">
                                      {person ? `${person.firstName} ${person.lastName}` : assignment.personnelId}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {assignment.siteRole}
                                      {assignment.employerName ? ` | ${assignment.employerName}` : ''}
                                    </p>
                                  </div>
                                </button>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{documentCount} docs</Badge>
                                  {expiredCount > 0 ? (
                                    <Badge className="border-red-200 bg-red-100 text-red-800">{expiredCount} expired</Badge>
                                  ) : (
                                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">No expired docs</Badge>
                                  )}
                                  {person ? (
                                    <ViewActionButton href={`/users/personnel/${person.id}`} label="Open User" />
                                  ) : null}
                                  <DeleteActionButton
                                    description="This will remove the user from the project assignment list."
                                    onDelete={() => handleRemoveAssignment(assignment.id)}
                                  />
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
                        <p className="mt-2 text-sm text-muted-foreground">
                          Use the assign button in the header to link existing users to this project.
                        </p>
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
                      <CardTitle className="text-lg font-black tracking-tight">
                        {selectedPerson.firstName} {selectedPerson.lastName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5">
                      {selectedPerson.documents && selectedPerson.documents.length > 0 ? (
                        selectedPerson.documents.map((document) => (
                          <div key={`${selectedPerson.id}-${document.name}`} className="rounded-lg border bg-background p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold">{document.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedPerson.email}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {getDocumentHealthBadge(document.expirationDate)}
                                <Badge variant="outline">
                                  {document.expirationDate ? format(new Date(document.expirationDate), 'dd MMM yyyy') : 'No expiry'}
                                </Badge>
                                <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                                  <a href={document.url} target="_blank" rel="noreferrer">
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">
                          This user currently has no uploaded documents on their profile.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                {assignedPersonnel.length > 0 ? (
                  assignedPersonnel.map(({ assignment, person }) => (
                    <Card key={assignment.id} className="border shadow-none">
                      <CardHeader className="space-y-2 border-b bg-background/70">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-lg font-black tracking-tight">
                              {person ? `${person.firstName} ${person.lastName}` : assignment.personnelId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.siteRole}
                              {assignment.employerName ? ` | ${assignment.employerName}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{person?.documents?.length || 0} docs linked</Badge>
                            {person ? <ViewActionButton href={`/users/personnel/${person.id}`} label="Open User" /> : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 p-5">
                        {person?.documents && person.documents.length > 0 ? (
                          person.documents.map((document) => (
                            <div key={`${assignment.id}-${document.name}`} className="rounded-lg border bg-background p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold">{document.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded {document.uploadDate ? format(new Date(document.uploadDate), 'dd MMM yyyy') : 'date unavailable'}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {getDocumentHealthBadge(document.expirationDate)}
                                  <Badge variant="outline">
                                    {document.expirationDate ? format(new Date(document.expirationDate), 'dd MMM yyyy') : 'No expiry'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">
                            No worker documents are currently available for this user.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border shadow-none">
                    <CardContent className="px-6 py-16 text-center text-sm text-muted-foreground">
                      Assign personnel first to see project-level compliance visibility.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
