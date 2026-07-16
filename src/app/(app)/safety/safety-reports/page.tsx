'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Clock, MapPin, User, ArrowRight, Loader2, WandSparkles, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useToast } from '@/hooks/use-toast';
import { callAiFlow } from '@/lib/ai-client';
import type { SafetyReport } from '@/types/safety-report';
import type { ExternalOrganization } from '@/types/quality';
import type { QuickSafetyReport } from '@/types/quick-reports';
import type { TechnicalQuickReport } from '@/types/quick-reports';
import { EditReportDialog } from './edit-report-dialog';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { GenerateSafetyProtocolRecommendationsOutput } from '@/ai/flows/generate-safety-protocol-recommendations';
import { CARD_HEADER_BAND_CLASS, HEADER_COMPACT_CONTROL_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationTabsRow } from '@/components/responsive-tab-row';
import { ArchiveActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import { dispatchSafeviateEvent, SAFEVIATE_QUICK_SAFETY_REPORTS_UPDATED, SAFEVIATE_SAFETY_REPORTS_UPDATED } from '@/lib/client-events';
import { usePageLayout } from '@/hooks/use-page-layout';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(year, month - 1, day, 12);
};

const isEmailLike = (value?: string | null) => Boolean(value && /\S+@\S+\.\S+/.test(value));

const resolveReporterLabel = (
    report: {
        isAnonymous?: boolean | null;
        submittedBy?: string | null;
        submittedByEmail?: string | null;
        submittedByName?: string | null;
        submittedOnBehalfOf?: string | null;
    },
    currentUserEmail?: string | null,
) => {
    if (report.isAnonymous) return 'Anonymous';
    const submittedOnBehalfOf = report.submittedOnBehalfOf?.trim() || '';
    const submittedByEmail = report.submittedByEmail?.trim() || '';
    const submittedByName = report.submittedByName?.trim() || '';
    const submittedBy = report.submittedBy?.trim() || '';
    const viewerEmail = currentUserEmail?.trim() || '';

    if (submittedOnBehalfOf) return submittedOnBehalfOf;
    if (submittedByEmail) return submittedByEmail;
    if (submittedByName && !/^vercel user$/i.test(submittedByName)) return submittedByName;
    if (isEmailLike(submittedBy)) return submittedBy;
    if ((/^vercel user$/i.test(submittedByName) || /^vercel-user$/i.test(submittedBy)) && viewerEmail) return viewerEmail;
    return submittedByName || submittedBy || 'Signed-in User';
};

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'Closed': return 'default';
        case 'Open': return 'destructive';
        case 'Under Review': return 'secondary';
        default: return 'outline';
    }
};

function ArchiveReportButton({ reportId, reportNumber }: { reportId: string, reportNumber: string }) {
    const { toast } = useToast();
    const { hasPermission } = usePermissions();

    const canDelete = hasPermission('safety-reports-delete');

    if (!canDelete) return null;

    const handleDelete = async () => {
        const response = await fetch('/api/safety-reports', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || 'Unable to delete this report right now.');
        }
        dispatchSafeviateEvent(SAFEVIATE_SAFETY_REPORTS_UPDATED);
        toast({ title: 'Report Archived', description: `Safety Report #${reportNumber} can be recalled from Archived.` });
    };

    return (
        <ArchiveActionButton
            description={`Safety Report #${reportNumber} will be moved to Archived. It will not be deleted and can be recalled later.`}
            onArchive={handleDelete}
            srLabel="Archive report"
        />
    );
}

interface ReportsTableProps {
    reports: SafetyReport[];
    tenantId: string;
    canManage: boolean;
    currentUserEmail?: string | null;
}

interface QuickSafetyInboxProps {
    reports: QuickSafetyReport[];
    canManage: boolean;
    classifyingReportId: string | null;
    departments: DepartmentOption[];
    onClassify: (report: QuickSafetyReport, department: DepartmentOption) => Promise<boolean>;
    onDelete: (report: QuickSafetyReport) => Promise<void>;
}

interface DepartmentOption {
    id: string;
    name: string;
}

function RecallReportButton({ reportId, reportNumber }: { reportId: string; reportNumber: string }) {
    const { toast } = useToast();
    const handleRecall = async () => {
        const response = await fetch('/api/safety-reports', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId, status: 'Open' }),
        });
        if (!response.ok) throw new Error('Unable to recall this report right now.');
        dispatchSafeviateEvent(SAFEVIATE_SAFETY_REPORTS_UPDATED);
        toast({ title: 'Report Recalled', description: `Safety Report #${reportNumber} is active again.` });
    };
    return <Button type="button" variant="outline" size="icon" className="h-8 w-8 border-slate-300" onClick={() => void handleRecall()} aria-label={`Recall report ${reportNumber}`}><ArchiveRestore className="h-3.5 w-3.5" /></Button>;
}

interface TechnicalIntakeProps {
    reports: TechnicalQuickReport[];
}

type ReportSortOrder = 'newest' | 'oldest';

const normalizeSafetyReportGroup = (value: string) => {
    const normalized = value.trim();
    return /^(flight|ground) operations$/i.test(normalized) ? 'Operations' : normalized;
};

const getSafetyReportGroup = (report: SafetyReport) => {
    const reportType = report.reportType?.trim() || '';
    if (reportType.toLowerCase() === 'preliminary safety report' && report.sourceQuickReportId) {
        return report.departmentName?.trim() ? normalizeSafetyReportGroup(report.departmentName) : 'Unassigned Safety Reports';
    }
    if (report.departmentName?.trim()) return normalizeSafetyReportGroup(report.departmentName);
    return reportType ? normalizeSafetyReportGroup(reportType) : 'Unclassified';
};

function ReportsTable({ reports, tenantId, canManage, currentUserEmail }: ReportsTableProps) {
    const groupedReports = reports.reduce<Record<string, SafetyReport[]>>((groups, report) => {
        const group = getSafetyReportGroup(report);
        (groups[group] ??= []).push(report);
        return groups;
    }, {});

    return (
        <div className="space-y-3 p-4">
            {Object.entries(groupedReports).map(([group, groupReports]) => (
                <section key={group} className="overflow-hidden rounded-lg border border-card-border bg-card">
                    <div className="flex h-[38px] items-center justify-between border-b border-card-border bg-muted/20 px-3">
                        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground">{group}</span>
                        <Badge variant="outline" className="h-5 text-[9px] font-black uppercase">{groupReports.length} reports</Badge>
                    </div>
                    <div className="divide-y divide-card-border">
                        {groupReports.map((report) => (
                            <div key={report.id} className="grid min-w-0 gap-3 p-3 md:grid-cols-[minmax(0,1.7fr)_minmax(110px,0.7fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_auto] md:items-center">
                                <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{report.reportNumber}</span>
                                        <Badge variant={getStatusBadgeVariant(report.status)} className="h-5 text-[9px] font-black uppercase">{report.status}</Badge>
                                    </div>
                                    <p className="mt-1 truncate text-sm font-bold text-foreground">{report.description || report.reportType}</p>
                                    <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Filed by: {resolveReporterLabel(report, currentUserEmail)}</p>
                                    {report.sourceQuickReportId ? <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Department: {report.departmentName || 'Not assigned'}</p> : null}
                                </div>
                                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date</p><p className="truncate text-xs font-semibold">{format(parseLocalDate(report.eventDate), 'dd MMM yyyy')}</p></div>
                                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Location</p><p className="truncate text-xs font-semibold">{report.location}</p></div>
                                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Source</p><p className="truncate text-xs font-semibold">{report.sourceQuickReportNumber || 'Direct report'}</p></div>
                                <div className="flex items-center justify-start gap-1 md:justify-end">
                                    <ViewActionButton
                                        href={`/safety/safety-reports/${report.id}`}
                                        label={`View safety report ${report.reportNumber}`}
                                        iconOnly
                                    />
                                    {canManage && <><EditReportDialog report={report} tenantId={tenantId} />{report.status === 'Archived' ? <RecallReportButton reportId={report.id} reportNumber={report.reportNumber} /> : <ArchiveReportButton reportId={report.id} reportNumber={report.reportNumber} />}</>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
            {reports.length === 0 && <div className="p-12 text-center text-sm italic text-muted-foreground">No safety reports found for this context.</div>}
        </div>
    );
}

function ClassifySafetyReportDialog({
    report,
    departments,
    isClassifying,
    onClassify,
}: {
    report: QuickSafetyReport;
    departments: DepartmentOption[];
    isClassifying: boolean;
    onClassify: (report: QuickSafetyReport, department: DepartmentOption) => Promise<boolean>;
}) {
    const [open, setOpen] = useState(false);
    const [departmentId, setDepartmentId] = useState('');
    const selectedDepartment = departments.find((department) => department.id === departmentId);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!isClassifying) setOpen(nextOpen);
        if (!nextOpen) setDepartmentId('');
    };

    const handleClassify = async () => {
        if (!selectedDepartment) return;
        const classified = await onClassify(report, selectedDepartment);
        if (classified) {
            setOpen(false);
            setDepartmentId('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    className="h-8 flex-1 justify-between px-3 text-[10px] font-black uppercase"
                    disabled={isClassifying}
                >
                    {isClassifying ? 'Classifying...' : 'Classify into Safety'}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-wide">Classify Safety Report</DialogTitle>
                    <DialogDescription>
                        Assign this preliminary quick report to the responsible department before it enters the formal safety register.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Department</p>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="h-10 bg-background text-xs font-bold">
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map((department) => (
                                <SelectItem key={department.id} value={department.id} className="text-xs">
                                    {department.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {departments.length === 0 ? (
                        <p className="text-xs text-destructive">No departments are configured for this organization yet.</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">The report will appear in this department after classification.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isClassifying}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={() => void handleClassify()} disabled={!selectedDepartment || isClassifying} className="font-black uppercase text-xs">
                        {isClassifying ? 'Classifying...' : 'Confirm Classification'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function QuickSafetyInbox({ reports, canManage, classifyingReportId, departments, onClassify, onDelete }: QuickSafetyInboxProps) {
    return (
        <div className="border-b bg-muted/5 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Quick Safety Intake</p>
                    <p className="text-xs font-medium text-muted-foreground">
                        Preliminary safety reports can be classified here into the formal safety register.
                    </p>
                </div>
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest">
                    {reports.length} awaiting review
                </Badge>
            </div>

            {reports.length > 0 ? (
                <ResponsiveCardGrid
                    items={reports}
                    isLoading={false}
                    gridClassName="sm:grid-cols-2 xl:grid-cols-3"
                    renderItem={(report) => (
                        <Card key={report.id} className="overflow-hidden border-slate-200 shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-background px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{report.reportNumber}</span>
                                    <span className="mt-1 text-sm font-black">{report.reportType}</span>
                                </div>
                                <Badge variant={report.workflowStatus === 'Classified' ? 'default' : 'outline'} className="text-[9px] font-black uppercase">
                                    {report.workflowStatus}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        {format(parseLocalDate(report.eventDate), 'dd MMM yyyy')}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {report.location}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    Filed by: {resolveReporterLabel(report)}
                                </div>
                                {report.aircraftLabel ? (
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Aircraft {report.aircraftLabel}
                                    </div>
                                ) : null}
                                {report.recommendedClassification ? (
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Recommended {report.recommendedClassification}
                                    </div>
                                ) : null}
                                <p className="text-sm font-medium text-foreground">{report.summary}</p>
                                {report.immediateAction ? (
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest">
                                                Action Logged
                                            </Badge>
                                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Immediate Action</p>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold text-foreground whitespace-pre-wrap">{report.immediateAction}</p>
                                    </div>
                                ) : null}
                            </CardContent>
                            <div className="flex flex-wrap gap-2 border-t bg-muted/5 p-2">
                                {report.linkedSafetyReportId ? (
                                    <Button asChild variant="outline" size="sm" className="h-8 flex-1 justify-between px-3 text-[10px] font-black uppercase">
                                        <Link href={`/safety/safety-reports/${report.linkedSafetyReportId}`}>
                                            View {report.linkedSafetyReportNumber || 'Safety Report'}
                                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                ) : canManage ? (
                                    <div className="flex flex-1 flex-wrap gap-2">
                                        <ClassifySafetyReportDialog
                                            report={report}
                                            departments={departments}
                                            isClassifying={classifyingReportId === report.id}
                                            onClassify={onClassify}
                                        />
                                        <ArchiveActionButton
                                            description={`Preliminary safety report #${report.reportNumber} will be archived and can be recalled later.`}
                                            onArchive={() => void onDelete(report)}
                                            srLabel={`Archive preliminary safety report ${report.reportNumber}`}
                                        />
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Awaiting management classification
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                    emptyState={null}
                />
            ) : (
                <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">No quick safety reports waiting</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] italic text-muted-foreground">
                        New preliminary safety reports will appear here for classification.
                    </p>
                </div>
            )}
        </div>
    );
}

function TechnicalIntake({ reports }: TechnicalIntakeProps) {
    const groupedReports = reports.reduce<Record<string, TechnicalQuickReport[]>>((groups, report) => {
        const group = report.aircraftLabel?.trim() || 'Unassigned aircraft';
        (groups[group] ??= []).push(report);
        return groups;
    }, {});

    return (
        <div className="border-b bg-muted/5 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Preliminary Technical Intake</p>
                    <p className="text-xs font-medium text-muted-foreground">
                        Aircraft-linked technical reports filed from QR codes and quick intake.
                    </p>
                </div>
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest">
                    {reports.length} open
                </Badge>
            </div>

            {reports.length > 0 ? (
                <div className="space-y-3">
                    {Object.entries(groupedReports).map(([group, groupReports]) => (
                        <section key={group} className="overflow-hidden rounded-lg border border-card-border bg-card">
                            <div className="flex h-[38px] items-center justify-between border-b border-card-border bg-muted/20 px-3">
                                <span className="truncate text-[13px] font-bold uppercase tracking-[0.08em] text-foreground">{group}</span>
                                <Badge variant="outline" className="h-5 text-[9px] font-black uppercase">{groupReports.length} reports</Badge>
                            </div>
                            <div className="divide-y divide-card-border">
                                {groupReports.map((report) => (
                                    <div key={report.id} className="grid min-w-0 gap-3 p-3 md:grid-cols-[minmax(0,1.7fr)_minmax(110px,0.7fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_auto] md:items-center">
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{report.reportNumber}</span>
                                                <Badge variant={report.status === 'Closed' ? 'default' : 'destructive'} className="h-5 text-[9px] font-black uppercase">{report.status}</Badge>
                                            </div>
                                            <p className="mt-1 truncate text-sm font-bold">{report.title || report.summary}</p>
                                            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Filed by: {resolveReporterLabel(report)}</p>
                                        </div>
                                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date</p><p className="truncate text-xs font-semibold">{format(parseLocalDate(report.eventDate), 'dd MMM yyyy')}</p></div>
                                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Location</p><p className="truncate text-xs font-semibold">{report.location}</p></div>
                                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Aircraft</p><p className="truncate text-xs font-semibold">{report.aircraftLabel || 'Not specified'}</p></div>
                                        <ViewActionButton
                                            href={`/quick-reports/technical-report/${report.id}`}
                                            label={`View technical report ${report.reportNumber}`}
                                            iconOnly
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed bg-background px-6 py-8 text-center text-sm text-muted-foreground">
                    No preliminary technical reports have been filed yet.
                </div>
            )}
        </div>
    );
}

function SafetyRecommendationsDialog({ reports }: { reports: SafetyReport[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState('');

    const canAnalyze = reports.length > 0;

    const handleAnalyze = async () => {
        if (!canAnalyze) return;

        setIsLoading(true);
        try {
            const incidentReports = reports
                .map(report => {
                    const hazards = (report.initialHazards || [])
                        .map(hazard => `Hazard: ${hazard.description}`)
                        .join('\n');

                    return [
                        `Report #: ${report.reportNumber}`,
                        `Type: ${report.reportType}`,
                        `Status: ${report.status}`,
                        `Event Date: ${report.eventDate}`,
                        `Location: ${report.location}`,
                        `Description: ${report.description}`,
                        hazards,
                    ]
                        .filter(Boolean)
                        .join('\n');
                })
                .join('\n\n---\n\n');

            const result = await callAiFlow<
                { incidentReports: string },
                GenerateSafetyProtocolRecommendationsOutput
            >('generateSafetyProtocolRecommendations', { incidentReports });

            setRecommendations(result.recommendations);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-black uppercase gap-2 border-slate-300" disabled={!canAnalyze}>
                    <WandSparkles className="h-3.5 w-3.5 text-primary" />
                    AI Insights
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Safety Protocol Recommendations</DialogTitle>
                    <DialogDescription>
                        Generate AI recommendations based on the reports visible in this tab.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-wrap font-medium">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating recommendations...
                        </div>
                    ) : recommendations ? (
                        recommendations
                    ) : (
                        'No recommendations generated yet.'
                    )}
                </div>
                <DialogFooter>
                <Button onClick={handleAnalyze} disabled={isLoading || !canAnalyze} className="font-black uppercase text-xs">
                        {isLoading ? 'Generating...' : 'Generate Recommendations'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SafetyReportsPage() {
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'safety-reports-view' });
  const { isPageEnabled } = usePageLayout('safety-reports');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeOrgTab, setActiveOrgTab] = useState('internal');
  const [allReports, setAllReports] = useState<SafetyReport[]>([]);
  const [quickSafetyReports, setQuickSafetyReports] = useState<QuickSafetyReport[]>([]);
  const [technicalReports, setTechnicalReports] = useState<TechnicalQuickReport[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [classifyingQuickReportId, setClassifyingQuickReportId] = useState<string | null>(null);
  const [reportSortOrder, setReportSortOrder] = useState<ReportSortOrder>('newest');
  const [reportView, setReportView] = useState<'active' | 'archived'>('active');

  const canManageAll = hasPermission('safety-reports-edit');
  function isCurrentTenantRecord(record: { tenantId?: string | null }) {
    return record.tenantId === tenantId;
  }

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tenantId) {
        setIsLoadingReports(false);
        return;
      }

      setIsLoadingReports(true);
      try {
        const [response, quickResponse, summaryResponse] = await Promise.all([
            fetch('/api/safety-reports', { cache: 'no-store' }),
            fetch('/api/quick-safety-reports', { cache: 'no-store' }),
            fetch('/api/dashboard-summary', { cache: 'no-store' }),
        ]);
        const payload = await response.json();
        const quickPayload = await quickResponse.json().catch(() => ({ reports: [] }));
        const summaryPayload = await summaryResponse.json().catch(() => ({ technicalReports: [] }));
        if (!cancelled) {
          setAllReports(Array.isArray(payload.reports) ? payload.reports.filter(isCurrentTenantRecord) : []);
          setQuickSafetyReports(Array.isArray(quickPayload?.reports) ? quickPayload.reports.filter(isCurrentTenantRecord) : []);
          setTechnicalReports(Array.isArray(summaryPayload?.technicalReports) ? summaryPayload.technicalReports.filter(isCurrentTenantRecord) : []);
        }
      } finally {
        if (!cancelled) setIsLoadingReports(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      if (!tenantId) {
        setDepartments([]);
        return;
      }

      try {
        const response = await fetch('/api/departments', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ departments: [] }));
        if (!cancelled) {
          setDepartments(
            Array.isArray(payload?.departments)
              ? payload.departments
                  .filter((department: { id?: unknown; name?: unknown }) => typeof department.id === 'string' && typeof department.name === 'string')
                  .map((department: { id: string; name: string }) => ({ id: department.id, name: department.name }))
              : []
          );
        }
      } catch {
        if (!cancelled) setDepartments([]);
      }
    };

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    const refreshReports = () => {
      if (!tenantId) return;

      void (async () => {
        try {
          const [response, quickResponse, summaryResponse] = await Promise.all([
            fetch('/api/safety-reports', { cache: 'no-store' }),
            fetch('/api/quick-safety-reports', { cache: 'no-store' }),
            fetch('/api/dashboard-summary', { cache: 'no-store' }),
          ]);

          const payload = await response.json().catch(() => ({ reports: [] }));
          const quickPayload = await quickResponse.json().catch(() => ({ reports: [] }));
          const summaryPayload = await summaryResponse.json().catch(() => ({ technicalReports: [] }));

          setAllReports(Array.isArray(payload.reports) ? payload.reports.filter(isCurrentTenantRecord) : []);
          setQuickSafetyReports(Array.isArray(quickPayload?.reports) ? quickPayload.reports.filter(isCurrentTenantRecord) : []);
          setTechnicalReports(Array.isArray(summaryPayload?.technicalReports) ? summaryPayload.technicalReports.filter(isCurrentTenantRecord) : []);
        } catch {
          setAllReports([]);
          setQuickSafetyReports([]);
          setTechnicalReports([]);
        }
      })();
    };

    window.addEventListener(SAFEVIATE_SAFETY_REPORTS_UPDATED, refreshReports);
    window.addEventListener(SAFEVIATE_QUICK_SAFETY_REPORTS_UPDATED, refreshReports);
    window.addEventListener('safeviate-technical-reports-updated', refreshReports);

    return () => {
      window.removeEventListener(SAFEVIATE_SAFETY_REPORTS_UPDATED, refreshReports);
      window.removeEventListener(SAFEVIATE_QUICK_SAFETY_REPORTS_UPDATED, refreshReports);
      window.removeEventListener('safeviate-technical-reports-updated', refreshReports);
    };
  }, [tenantId]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const response = await fetch('/api/external-organizations', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ organizations: [] }));
        setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
      } catch {
        setOrganizations([]);
      }
    };

    void loadOrganizations();
    window.addEventListener('safeviate-external-organizations-updated', loadOrganizations);
    return () => {
      window.removeEventListener('safeviate-external-organizations-updated', loadOrganizations);
    };
  }, []);

  const isLoading = isLoadingReports;

  if (!isPageEnabled) {
    return (
      <div className="max-w-[1100px] mx-auto w-full px-1 pt-4">
        <Card className="border shadow-none">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            This page is disabled for the current tenant layout.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleClassifyQuickReport = async (report: QuickSafetyReport, department: DepartmentOption) => {
    setClassifyingQuickReportId(report.id);
    try {
      const eventClassification =
        report.recommendedClassification && report.recommendedClassification !== 'General Concern'
          ? report.recommendedClassification
          : undefined;
      const description = report.immediateAction
        ? `${report.summary}\n\nImmediate action taken:\n${report.immediateAction}`
        : report.summary;

      const safetyResponse = await fetch('/api/safety-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            reportType: report.reportType,
            departmentId: department.id,
            departmentName: department.name,
            status: 'Open',
            submittedBy: report.submittedByEmail || report.submittedById || 'quick-safety-report',
            submittedByEmail: report.submittedByEmail || null,
            submittedByName: report.submittedByEmail || report.submittedByName,
            submittedAt: new Date().toISOString(),
            isAnonymous: false,
            eventDate: report.eventDate,
            eventTime: report.eventTime,
            location: report.location,
            description,
            immediateAction: report.immediateAction || null,
            occurrenceCategory: 'Quick Safety Report',
            eventClassification,
            sourceQuickReportId: report.id,
            sourceQuickReportNumber: report.reportNumber,
          },
        }),
      });
      const safetyPayload = await safetyResponse.json().catch(() => ({}));
      if (!safetyResponse.ok) {
        throw new Error(safetyPayload?.error || 'Failed to create the formal safety report.');
      }
      const createdSafetyReport = safetyPayload.report as SafetyReport | undefined;
      const newSafetyReportId = createdSafetyReport?.id;
      const newSafetyReportNumber = createdSafetyReport?.reportNumber;
      if (!newSafetyReportId || !newSafetyReportNumber) {
        throw new Error('Formal safety report was created without an id or report number.');
      }

      const quickResponse = await fetch('/api/quick-safety-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            ...report,
            workflowStatus: 'Classified',
            status: 'Closed',
            linkedSafetyReportId: newSafetyReportId,
            linkedSafetyReportNumber: newSafetyReportNumber,
          },
        }),
      });
      const quickPayload = await quickResponse.json().catch(() => ({}));
      if (!quickResponse.ok) {
        throw new Error(quickPayload?.error || 'Failed to link the quick safety report.');
      }

      setAllReports((current) => [createdSafetyReport, ...current]);
      setQuickSafetyReports((current) =>
        current.map((entry) =>
          entry.id === report.id
            ? {
                ...entry,
                workflowStatus: 'Classified',
                status: 'Closed',
                linkedSafetyReportId: newSafetyReportId,
                linkedSafetyReportNumber: newSafetyReportNumber,
              }
            : entry
        )
      );
      dispatchSafeviateEvent(SAFEVIATE_SAFETY_REPORTS_UPDATED);
      dispatchSafeviateEvent(SAFEVIATE_QUICK_SAFETY_REPORTS_UPDATED);

      toast({
        title: 'Quick Safety Report Classified',
        description: `${report.reportNumber} is now linked to formal safety report ${newSafetyReportNumber}.`,
      });
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Classification Failed',
        description: error instanceof Error ? error.message : 'Failed to classify the quick safety report.',
      });
      return false;
    } finally {
      setClassifyingQuickReportId(null);
    }
  };

  const handleDeleteQuickReport = async (report: QuickSafetyReport) => {
    try {
      const response = await fetch('/api/quick-safety-reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete the preliminary safety report.');
      }

      setQuickSafetyReports((current) => current.filter((entry) => entry.id !== report.id));
      dispatchSafeviateEvent(SAFEVIATE_QUICK_SAFETY_REPORTS_UPDATED);
      toast({
        title: 'Preliminary Report Deleted',
        description: `${report.reportNumber} has been removed from quick intake.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete the preliminary safety report.',
      });
    }
  };

  const renderOrgCard = (orgId: string | 'internal') => {
    const filteredReports = [...((allReports || []).filter(r =>
        (orgId === 'internal' ? !r.organizationId : r.organizationId === orgId) &&
        (reportView === 'archived' ? r.status === 'Archived' : r.status !== 'Archived')
    ))].sort((left, right) => {
        const leftDate = left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
        const rightDate = right.createdAt ? Date.parse(right.createdAt) : Number.NaN;
        const normalizedLeftDate = Number.isFinite(leftDate) ? leftDate : parseLocalDate(left.eventDate).getTime();
        const normalizedRightDate = Number.isFinite(rightDate) ? rightDate : parseLocalDate(right.eventDate).getTime();
        return reportSortOrder === 'oldest'
          ? normalizedLeftDate - normalizedRightDate
          : normalizedRightDate - normalizedLeftDate;
    });
    const internalQuickSafetyReports = (quickSafetyReports || []).filter((report) => !report.linkedSafetyReportId);
    const headerBandBorderStyle = { borderBottomColor: 'hsl(var(--card-border))' };
    const fileReportButton = (
      <Button
        asChild
        variant={isMobile ? 'outline' : 'default'}
        size="sm"
        className={
          isMobile
            ? cn(
                HEADER_SECONDARY_BUTTON_CLASS,
                HEADER_COMPACT_CONTROL_CLASS,
                'h-[25px] min-h-[25px] w-full justify-center px-2 text-[9px] font-black uppercase tracking-[0.08em] border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900',
              )
            : cn(
                HEADER_SECONDARY_BUTTON_CLASS,
                HEADER_COMPACT_CONTROL_CLASS,
                'h-[25px] min-h-[25px] w-full sm:w-auto justify-center text-[9px] font-black uppercase tracking-[0.08em] border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900',
              )
        }
      >
        <Link href={`/safety/new-report?orgId=${orgId}`} aria-label={isMobile ? 'File new report' : undefined}>
          <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} />
          {!isMobile ? 'File New Report' : null}
        </Link>
      </Button>
    );

    return (
        <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border shadow-none">
            <div className="flex flex-col bg-muted/5">
                <div className={CARD_HEADER_BAND_CLASS} style={headerBandBorderStyle}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            {shouldShowOrganizationTabs ? (
                                <OrganizationTabsRow
                                    organizations={organizations || []}
                                    activeTab={activeOrgTab}
                                    onTabChange={setActiveOrgTab}
                                    className="border-0 bg-transparent px-0 py-0 shrink-0"
                                    controlClassName="h-[25px] min-h-[25px]"
                                />
                            ) : (
                                <div className="min-h-8" />
                            )}
                        </div>
                        <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                            <Button asChild variant="outline" size="sm" className={cn(HEADER_SECONDARY_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS, 'h-[25px] min-h-[25px] w-full sm:w-auto')}>
                                <Link href="/safety/safety-reports/monitoring" aria-label="Open post-closure monitoring">
                                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                                    Monitoring
                                </Link>
                            </Button>
                            <Select value={reportView} onValueChange={(value: 'active' | 'archived') => setReportView(value)}>
                                <SelectTrigger className={cn(HEADER_COMPACT_CONTROL_CLASS, 'h-[25px] min-h-[25px] w-full border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-900 sm:w-[120px]')} aria-label="Filter archived safety reports">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={reportSortOrder} onValueChange={(value: ReportSortOrder) => setReportSortOrder(value)}>
                                <SelectTrigger
                                    className={cn(
                                        HEADER_COMPACT_CONTROL_CLASS,
                                        'h-[25px] min-h-[25px] w-full border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-900 sm:w-[168px]'
                                    )}
                                    aria-label="Sort safety reports by date"
                                >
                                    <SelectValue placeholder="Sort by date" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest to Oldest</SelectItem>
                                    <SelectItem value="oldest">Oldest to Newest</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className={cn('shrink-0', isMobile ? 'w-full' : 'w-auto')}>
                            {fileReportButton}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 bg-background">
                {orgId === 'internal' ? (
                    <>
                        <TechnicalIntake reports={technicalReports} />
                        <QuickSafetyInbox
                            reports={internalQuickSafetyReports}
                            canManage={canManageAll}
                            classifyingReportId={classifyingQuickReportId}
                            departments={departments}
                            onClassify={handleClassifyQuickReport}
                            onDelete={handleDeleteQuickReport}
                        />
                    </>
                ) : null}
                <ReportsTable reports={filteredReports} tenantId={tenantId || ''} canManage={canManageAll} currentUserEmail={userProfile?.email} />
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="mx-auto w-full max-w-[1100px] space-y-6 px-1 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const showTabs = shouldShowOrganizationTabs;

  return (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-6 overflow-hidden px-1 pt-4">
        {!showTabs ? (
            renderOrgCard(scopedOrganizationId)
        ) : (
            <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="flex h-full min-h-0 w-full flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
                    <TabsContent value="internal" className="mt-0 h-full min-h-0">
                        {renderOrgCard('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className="mt-0 h-full min-h-0">
                            {renderOrgCard(org.id)}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        )}
    </div>
  );
}
