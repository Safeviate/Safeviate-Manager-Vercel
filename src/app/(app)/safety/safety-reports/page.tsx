'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { SafetyReport } from '@/types/safety-report';
import type { ExternalOrganization } from '@/types/quality';
import type { TabVisibilitySettings } from '../../admin/external/page';

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Closed': return 'default';
        case 'Open': return 'destructive';
        case 'Under Review': return 'secondary';
        default: return 'outline';
    }
};

interface ReportsTableProps {
    reports: SafetyReport[];
    tenantId: string;
}

function ReportsTable({ reports, tenantId }: ReportsTableProps) {
    if (reports.length === 0) {
        return <div className="text-center p-8 text-muted-foreground text-sm italic">No safety reports found for this context.</div>;
    }

    return (
        <Table>
            <TableHeader>
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
                            <Button asChild variant="default" size="sm" className="h-8 px-3 text-xs">
                                <Link href={`/safety/safety-reports/${report.id}`}>
                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    View
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function SafetyReportsPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const canViewAll = hasPermission('safety-reports-manage');
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
            <CardContent className="p-0">
                <ReportsTable reports={filteredReports} tenantId={tenantId || 'safeviate'} />
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['safety-reports'] ?? true;
  const showTabs = isTabEnabled && canViewAll;

  // If external user or tabs disabled
  if (!showTabs) {
    return renderOrgContext(userOrgId || 'internal');
  }

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
            <p className="text-muted-foreground">Manage and track organizational safety occurrences.</p>
        </div>

        <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
            <div className="px-1 shrink-0">
                <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
                    <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Internal</TabsTrigger>
                    {(organizations || []).map(org => (
                        <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                            {org.name}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

            <TabsContent value="internal" className="mt-0">
                {renderOrgContext('internal')}
            </TabsContent>
            
            {(organizations || []).map(org => (
                <TabsContent key={org.id} value={org.id} className="mt-0">
                    {renderOrgContext(org.id)}
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
