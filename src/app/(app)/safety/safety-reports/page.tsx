'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, ShieldAlert, Clock, MapPin, User, ArrowRight, Loader2, WandSparkles, FileWarning, Building } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useToast } from '@/hooks/use-toast';
import { callAiFlow } from '@/lib/ai-client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { SafetyReport } from '@/types/safety-report';
import type { ExternalOrganization, TabVisibilitySettings } from '@/types/quality';
import { EditReportDialog } from './edit-report-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { MainPageHeader } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CompanyTabsRow({ organizations, activeTab, onTabChange }: { organizations: ExternalOrganization[], activeTab: string, onTabChange: (value: string) => void }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <div className="border-b bg-muted/5 px-4 py-3">
                <Select value={activeTab} onValueChange={onTabChange}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                        <SelectValue placeholder="Select Organization" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="internal" className="text-[10px] font-bold uppercase">
                            <div className="flex items-center gap-2">
                                <Building className="h-3.5 w-3.5" />
                                Internal
                            </div>
                        </SelectItem>
                        {organizations.map((organization) => (
                            <SelectItem key={organization.id} value={organization.id} className="text-[10px] font-bold uppercase">
                                <div className="flex items-center gap-2">
                                    <Building className="h-3.5 w-3.5" />
                                    {organization.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                <TabsTrigger 
                    value="internal" 
                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                >
                    Internal
                </TabsTrigger>
                {organizations.map((organization) => (
                    <TabsTrigger
                        key={organization.id}
                        value={organization.id}
                        className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                    >
                        {organization.name}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Closed': return 'default';
        case 'Open': return 'destructive';
        case 'Under Review': return 'secondary';
        default: return 'outline';
    }
};

function DeleteReportButton({ reportId, reportNumber, tenantId }: { reportId: string, reportNumber: string, tenantId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();

    const canDelete = hasPermission('safety-reports-manage');

    if (!canDelete) return null;

    const handleDelete = () => {
        if (!firestore) return;
        const reportRef = doc(firestore, `tenants/${tenantId}/safety-reports`, reportId);
        deleteDocumentNonBlocking(reportRef);
        toast({
            title: 'Report Deleted',
            description: `Safety Report #${reportNumber} is being deleted.`,
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8 shadow-sm">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Report</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete safety report #{reportNumber}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

interface ReportsTableProps {
    reports: SafetyReport[];
    tenantId: string;
    canManage: boolean;
}

function ReportsTable({ reports, tenantId, canManage }: ReportsTableProps) {
    if (reports.length === 0) {
        return <div className="text-center p-12 text-muted-foreground text-sm italic">No safety reports found for this context.</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden lg:block overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Report #</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Type</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Event Date</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Submitted By</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map(report => (
                            <TableRow key={report.id}>
                                <TableCell className="font-bold text-sm text-primary">{report.reportNumber}</TableCell>
                                <TableCell className="text-sm font-medium">{report.reportType}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{format(new Date(report.eventDate), 'dd MMM yy')}</TableCell>
                                <TableCell className="text-sm">{report.submittedByName}</TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(report.status)} className="text-[10px] font-bold uppercase">{report.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button asChild variant="outline" size="sm" className="h-8 gap-2 border-slate-300">
                                            <Link href={`/safety/safety-reports/${report.id}`}>
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Link>
                                        </Button>
                                        {canManage && <EditReportDialog report={report} tenantId={tenantId} />}
                                        <DeleteReportButton reportId={report.id} reportNumber={report.reportNumber} tenantId={tenantId} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4">
                {reports.map(report => (
                    <Card key={report.id} className="shadow-none border-slate-200 overflow-hidden">
                        <div className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{report.reportNumber}</span>
                                <span className="text-sm font-black mt-1">{report.reportType}</span>
                            </div>
                            <Badge variant={getStatusBadgeVariant(report.status)} className="h-5 text-[9px] font-black uppercase">
                                {report.status}
                            </Badge>
                        </div>
                        <CardContent className="p-4 py-3 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(report.eventDate), 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {report.location}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                Filed by: {report.submittedByName}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic font-medium">&quot;{report.description}&quot;</p>
                        </CardContent>
                        <div className="p-2 border-t bg-muted/5 flex gap-2">
                            <Button asChild variant="ghost" size="sm" className="flex-1 justify-between text-xs font-black uppercase h-8 px-4">
                                <Link href={`/safety/safety-reports/${report.id}`}>
                                    View Detailed Investigation
                                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                                </Link>
                            </Button>
                            {canManage && (
                                <div className="flex gap-1">
                                    <EditReportDialog report={report} tenantId={tenantId} />
                                    <DeleteReportButton reportId={report.id} reportNumber={report.reportNumber} tenantId={tenantId} />
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
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
                    <Button onClick={handleAnalyze} disabled={isLoading || !canAnalyze} className="bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-xs">
                        {isLoading ? 'Generating...' : 'Generate Recommendations'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SafetyReportsPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'safety-reports-manage' });
  const isMobile = useIsMobile();
  const [activeOrgTab, setActiveOrgTab] = useState('internal');

  const canManageAll = hasPermission('safety-reports-manage');

  const reportsQuery = useMemoFirebase(
    () => {
        if (!firestore || !tenantId) return null;
        return query(collection(firestore, `tenants/${tenantId}/safety-reports`), orderBy('submittedAt', 'desc'));
    },
    [firestore, tenantId]
  );

  const orgsQuery = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
    [firestore, tenantId]
  );

  const { data: allReports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

  const isLoading = isLoadingReports || isLoadingOrgs;

  const renderOrgCard = (orgId: string | 'internal') => {
    const filteredReports = (allReports || []).filter(r => 
        orgId === 'internal' ? !r.organizationId : r.organizationId === orgId
    );

    return (
        <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
            <MainPageHeader 
                title="Safety Occurrences"
                description="Monitor and manage all internal and external safety reports."
                actions={
                    <div className="flex items-center gap-3">
                        <Button asChild size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2">
                            <Link href={`/safety/new-report?orgId=${orgId}`}>
                                <PlusCircle className="h-4 w-4" />
                                {isMobile ? "File" : "File New Report"}
                            </Link>
                        </Button>
                    </div>
                }
            />
            {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} activeTab={activeOrgTab} onTabChange={setActiveOrgTab} />}
            <CardContent className="flex-1 p-0 overflow-hidden bg-background">
                <ReportsTable reports={filteredReports} tenantId={tenantId || 'safeviate'} canManage={canManageAll} />
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const showTabs = shouldShowOrganizationTabs;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
        {!showTabs ? (
            renderOrgCard(scopedOrganizationId)
        ) : (
            <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex flex-col h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="internal" className="mt-0 h-full">
                        {renderOrgCard('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className="mt-0 h-full">
                            {renderOrgCard(org.id)}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        )}
    </div>
  );
}
