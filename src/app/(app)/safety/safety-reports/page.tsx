'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, ShieldAlert, Clock, MapPin, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
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
                <Button variant="destructive" size="icon" className="h-8 w-8">
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
        return <div className="text-center p-8 text-muted-foreground text-sm italic">No safety reports found for this context.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden lg:block">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="text-xs uppercase font-bold">Report #</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Event Date</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Submitted By</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Status</TableHead>
                            <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map(report => (
                            <TableRow key={report.id}>
                                <TableCell className="font-medium text-xs">{report.reportNumber}</TableCell>
                                <TableCell className="text-xs">{report.reportType}</TableCell>
                                <TableCell className="text-xs whitespace-nowrap">{format(new Date(report.eventDate), 'dd MMM yy')}</TableCell>
                                <TableCell className="text-xs">{report.submittedByName}</TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(report.status)} className="text-[10px] py-0">{report.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button asChild variant="outline" size="sm" className="h-8 gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {reports.map(report => (
                    <Card key={report.id} className="shadow-none border-slate-200 overflow-hidden">
                        <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{report.reportNumber}</span>
                                <span className="text-sm font-black mt-1">{report.reportType}</span>
                            </div>
                            <Badge variant={getStatusBadgeVariant(report.status)} className="h-5 text-[9px] font-black uppercase">
                                {report.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 py-3 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(report.eventDate), 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {report.location}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                Filed by: {report.submittedByName}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">&quot;{report.description}&quot;</p>
                        </CardContent>
                        <div className="p-2 border-t bg-muted/5 flex gap-2">
                            <Button asChild variant="ghost" size="sm" className="flex-1 justify-between text-xs font-bold h-8 px-4">
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

export default function SafetyReportsPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const canManageAll = hasPermission('safety-reports-manage');
  const userOrgId = userProfile?.organizationId;

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

  const visibilitySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );

  const { data: allReports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

  const isLoading = isLoadingReports || isLoadingOrgs || isLoadingVisibility;

  const renderOrgContext = (orgId: string | 'internal') => {
    const filteredReports = (allReports || []).filter(r => 
        orgId === 'internal' ? !r.organizationId : r.organizationId === orgId
    );

    return (
        <Card className="min-h-[400px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{orgId === 'internal' ? 'Internal Safety Reports' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                        <CardDescription>Review occurrences and safety concerns reported within this context.</CardDescription>
                    </div>
                    <Button asChild size="sm">
                        <Link href={`/safety/new-report?orgId=${orgId}`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            File Report
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 lg:p-6">
                <ReportsTable reports={filteredReports} tenantId={tenantId || 'safeviate'} canManage={canManageAll} />
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Skeleton className="h-10 w-[400px] rounded-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  const showTabs = canManageAll;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
            <p className="text-muted-foreground">Manage and track organizational safety occurrences.</p>
        </div>

        {!showTabs ? (
            renderOrgContext(userOrgId || 'internal')
        ) : (
            <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
                <div className="px-1 shrink-0">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                        <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Internal</TabsTrigger>
                        {(organizations || []).map(org => (
                            <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">
                                {org.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <TabsContent value="internal" className="mt-0">
                        {renderOrgContext('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className="mt-0">
                            {renderOrgContext(org.id)}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        )}
    </div>
  );
}
