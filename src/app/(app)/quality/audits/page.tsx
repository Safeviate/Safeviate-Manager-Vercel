'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useTabVisibility } from '@/hooks/use-tab-visibility';
import { cn } from '@/lib/utils';
import { deleteDocumentNonBlocking } from '@/firebase';

import type { QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

type EnrichedAudit = QualityAudit & {
    auditeeName?: string;
};

const getStatusBadgeVariant = (status: QualityAudit['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Closed': return 'default';
        case 'Finalized': return 'secondary';
        case 'In Progress': return 'outline';
        default: return 'secondary';
    }
};

interface AuditActionsProps {
    audit: EnrichedAudit;
    tenantId: string;
}

function AuditActions({ audit, tenantId }: AuditActionsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        if (!firestore) return;
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);
        deleteDocumentNonBlocking(auditRef);
        toast({ title: "Audit Deleted", description: `Audit #${audit.auditNumber} has been removed.`});
        setIsDeleteDialogOpen(false);
    }
    
    return (
        <div className="flex items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                <Link href={`/quality/audits/${audit.id}`}>
                    <Eye className="h-4 w-4" />
                    View
                </Link>
            </Button>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 px-3 text-xs">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete audit #{audit.auditNumber}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


interface AuditsTableProps {
    audits: EnrichedAudit[];
    tenantId: string;
}

function AuditsTable({ audits, tenantId }: AuditsTableProps) {
    if (audits.length === 0) {
        return <div className="text-center p-8 text-muted-foreground text-sm italic">No audits found for this context.</div>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-xs uppercase font-bold">Audit ID</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Date</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Title</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Auditee</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-center">Score</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Status</TableHead>
                    <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {audits.map(audit => (
                    <TableRow key={audit.id}>
                        <TableCell className="font-medium text-xs">
                            <Link href={`/quality/audits/${audit.id}`} className="hover:underline">{audit.auditNumber}</Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{format(new Date(audit.auditDate), 'dd MMM yy')}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{audit.title}</TableCell>
                        <TableCell className="text-xs">{audit.auditeeName || audit.auditeeId}</TableCell>
                        <TableCell className="text-center">
                            {audit.complianceScore ? (
                                <Badge variant="outline" className={cn(
                                    "font-mono text-[10px]",
                                    audit.complianceScore >= 80 ? "text-green-600 border-green-600 bg-green-50" : 
                                    audit.complianceScore >= 60 ? "text-yellow-600 border-yellow-600 bg-yellow-50" : 
                                    "text-red-600 border-red-600 bg-red-50"
                                )}>
                                    {audit.complianceScore}%
                                </Badge>
                            ) : '-'}
                        </TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(audit.status)} className="text-[10px] py-0">{audit.status}</Badge></TableCell>
                        <TableCell className="text-right">
                           <AuditActions audit={audit} tenantId={tenantId} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function AuditsPage() {
    const firestore = useFirestore();
    const { tenantId, userProfile } = useUserProfile();
    const { hasPermission } = usePermissions();

    const canViewAll = hasPermission('quality-audits-view-all');
    const userOrgId = userProfile?.organizationId;

    const auditsQuery = useMemoFirebase(
        () => {
            if (!firestore || !tenantId) return null;
            return query(collection(firestore, `tenants/${tenantId}/quality-audits`), orderBy('auditDate', 'desc'));
        },
        [firestore, tenantId]
    );

    const personnelQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null),
        [firestore, tenantId]
    );
    const departmentsQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/departments`) : null),
        [firestore, tenantId]
    );
    const orgsQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
        [firestore, tenantId]
    );

    const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
    const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

    const showTabs = useTabVisibility('audits', canViewAll);

    const isLoading = isLoadingAudits || isLoadingPersonnel || isLoadingDepts || isLoadingOrgs;

    const enrichedAudits = useMemo((): EnrichedAudit[] => {
        if (!audits || !personnel || !departments || !organizations) return [];

        const personnelMap = new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
        const departmentMap = new Map(departments.map(d => [d.id, d.name]));
        const orgMap = new Map(organizations.map(o => [o.id, o.name]));

        return audits.map(audit => ({
            ...audit,
            auditeeName: personnelMap.get(audit.auditeeId) || departmentMap.get(audit.auditeeId) || orgMap.get(audit.organizationId || ''),
        }));
    }, [audits, personnel, departments, organizations]);

    const renderOrgContext = (orgId: string | 'internal') => {
        const filteredByOrg = enrichedAudits.filter(a => 
            orgId === 'internal' ? !a.organizationId : a.organizationId === orgId
        );
        
        const activeAudits = filteredByOrg.filter(a => a.status !== 'Archived');
        const archivedAudits = filteredByOrg.filter(a => a.status === 'Archived');

        return (
            <Card className="min-h-[calc(100vh-15rem)] flex flex-col shadow-none border">
                <Tabs defaultValue="active" className="flex-1 flex flex-col">
                    <div className='px-6 pt-4 border-b bg-muted/10'>
                        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-2 border-b-0 overflow-x-auto no-scrollbar w-full flex">
                            <TabsTrigger value="active" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Active ({activeAudits.length})</TabsTrigger>
                            <TabsTrigger value="archived" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Archived ({archivedAudits.length})</TabsTrigger>
                        </TabsList>
                    </div>
                    <CardContent className="p-0 flex-1">
                        <TabsContent value="active" className="m-0">
                            <AuditsTable audits={activeAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                        <TabsContent value="archived" className="m-0">
                            <AuditsTable audits={archivedAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-[1200px] mx-auto w-full">
                <Skeleton className="h-10 w-[400px] rounded-full" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
            <div className="px-1">
                <h1 className="text-3xl font-bold tracking-tight">Quality Audits</h1>
                <p className="text-muted-foreground">Manage internal and external quality assurance activities.</p>
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

                    <TabsContent value="internal" className="mt-0">
                        {renderOrgContext('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className="mt-0">
                            {renderOrgContext(org.id)}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    )
}
