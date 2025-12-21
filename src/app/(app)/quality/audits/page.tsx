
'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import type { QualityAudit } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

type EnrichedAudit = QualityAudit & {
    auditeeName?: string;
    departmentName?: string;
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
    isArchived: boolean;
}

function AuditActions({ audit, tenantId, isArchived }: AuditActionsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleUpdateStatus = (newStatus: QualityAudit['status']) => {
        if (!firestore) return;
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);
        updateDocumentNonBlocking(auditRef, { status: newStatus });
        toast({ title: "Audit Status Updated", description: `Audit #${audit.auditNumber} has been ${newStatus.toLowerCase()}.`});
    }

    const handleDelete = () => {
        if (!firestore) return;
        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);
        deleteDocumentNonBlocking(auditRef);
        toast({ title: "Audit Deleted", description: `Audit #${audit.auditNumber} is being permanently deleted.`});
    }
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                     <Link href={`/quality/audits/${audit.id}`}><Eye className="mr-2 h-4 w-4" /> View Details</Link>
                </DropdownMenuItem>
                {!isArchived ? (
                     <DropdownMenuItem onSelect={() => handleUpdateStatus('Archived')}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                ) : (
                    <>
                    <DropdownMenuItem onSelect={() => handleUpdateStatus('Closed')}>
                        <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                    </DropdownMenuItem>
                     <DropdownMenuItem onSelect={handleDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                    </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


interface AuditsTableProps {
    audits: EnrichedAudit[];
    tenantId: string;
    isArchivedTab: boolean;
}

function AuditsTable({ audits, tenantId, isArchivedTab }: AuditsTableProps) {
    if (audits.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No audits in this category.</div>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Audit ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Auditee</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {audits.map(audit => (
                    <TableRow key={audit.id}>
                        <TableCell className="font-medium">
                            <Link href={`/quality/audits/${audit.id}`} className="hover:underline">{audit.auditNumber}</Link>
                        </TableCell>
                        <TableCell>{format(new Date(audit.auditDate), 'PPP')}</TableCell>
                        <TableCell>{audit.title}</TableCell>
                        <TableCell>{audit.auditeeName || audit.auditeeId}</TableCell>
                        <TableCell>{audit.complianceScore ? `${audit.complianceScore}%` : 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(audit.status)}>{audit.status}</Badge></TableCell>
                        <TableCell className="text-right">
                           <AuditActions audit={audit} tenantId={tenantId} isArchived={isArchivedTab} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function AuditsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const auditsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`), orderBy('auditDate', 'desc')) : null),
        [firestore, tenantId]
    );
    const personnelQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null),
        [firestore, tenantId]
    );
     const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/departments`) : null),
        [firestore, tenantId]
    );

    const { data: audits, isLoading: isLoadingAudits, error: auditsError } = useCollection<QualityAudit>(auditsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);

    const isLoading = isLoadingAudits || isLoadingPersonnel || isLoadingDepts;

    const enrichedAudits = useMemo((): EnrichedAudit[] => {
        if (!audits || !personnel || !departments) return [];

        const personnelMap = new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
        const departmentMap = new Map(departments.map(d => [d.id, d.name]));

        return audits.map(audit => ({
            ...audit,
            auditeeName: personnelMap.get(audit.auditeeId) || departmentMap.get(audit.auditeeId),
        }));
    }, [audits, personnel, departments]);

    const activeAudits = useMemo(() => enrichedAudits.filter(a => a.status !== 'Archived'), [enrichedAudits]);
    const archivedAudits = useMemo(() => enrichedAudits.filter(a => a.status === 'Archived'), [enrichedAudits]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (auditsError) {
        return <p className="text-destructive text-center">Error loading audits: {auditsError.message}</p>
    }

    return (
        <Card>
            <Tabs defaultValue="active">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <TabsList>
                            <TabsTrigger value="active">Active Audits ({activeAudits.length})</TabsTrigger>
                            <TabsTrigger value="archived">Archived ({archivedAudits.length})</TabsTrigger>
                        </TabsList>
                        {/* Placeholder for Search Bar */}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <TabsContent value="active" className="m-0">
                        <AuditsTable audits={activeAudits} tenantId={tenantId} isArchivedTab={false} />
                    </TabsContent>
                    <TabsContent value="archived" className="m-0">
                        <AuditsTable audits={archivedAudits} tenantId={tenantId} isArchivedTab={true} />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    )
}
