'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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
import { Eye, Trash2, Calendar, ClipboardCheck, ArrowRight, ShieldCheck, Building, ListFilter } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useTabVisibility } from '@/hooks/use-tab-visibility';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
            <Button asChild variant="outline" size="compact" className="border-slate-300">
                <Link href={`/quality/audits/${audit.id}`}>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">View</span>
                </Link>
            </Button>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5" />
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
        return <div className="text-center p-8 text-muted-foreground text-sm italic uppercase font-bold tracking-widest bg-muted/5">No audits found for this context.</div>
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">ID</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Date</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Title</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider hidden sm:table-cell">Auditee</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">Score</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {audits.map(audit => (
                            <TableRow key={audit.id} className="hover:bg-muted/5 transition-colors">
                                <TableCell className="font-bold text-xs text-primary">
                                    <Link href={`/quality/audits/${audit.id}`} className="hover:underline">{audit.auditNumber}</Link>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-xs font-medium">{format(new Date(audit.auditDate), 'dd MMM yy')}</TableCell>
                                <TableCell className="text-xs font-bold max-w-[150px] truncate">{audit.title}</TableCell>
                                <TableCell className="text-xs font-medium hidden sm:table-cell">{audit.auditeeName || audit.auditeeId}</TableCell>
                                <TableCell className="text-center">
                                    {audit.complianceScore !== undefined ? (
                                        <Badge variant="outline" className={cn(
                                            "font-black text-[9px] uppercase py-0.5 px-2",
                                            audit.complianceScore >= 80 ? "text-green-600 border-green-600 bg-green-50" : 
                                            audit.complianceScore >= 60 ? "text-yellow-600 border-yellow-600 bg-yellow-50" : 
                                            "text-red-600 border-red-600 bg-red-50"
                                        )}>
                                            {audit.complianceScore}%
                                        </Badge>
                                    ) : '-'}
                                </TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(audit.status)} className="text-[9px] font-black uppercase py-0.5 px-2">{audit.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <AuditActions audit={audit} tenantId={tenantId} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default function AuditsPage() {
    const firestore = useFirestore();
    const { tenantId } = useUserProfile();
    const { hasPermission } = usePermissions();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-audits-view-all' });
    const isMobile = useIsMobile();
    const [activeOrgTab, setActiveOrgTab] = useState('internal');
    const [activeStatusTab, setActiveStatusTab] = useState('active');

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

    const showTabs = useTabVisibility('audits', shouldShowOrganizationTabs);

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

    const renderOrgCard = (orgId: string | 'internal') => {
        const filteredByOrg = enrichedAudits.filter(a => 
            orgId === 'internal' ? !a.organizationId : a.organizationId === orgId
        );
        
        const activeAudits = filteredByOrg.filter(a => a.status !== 'Archived');
        const archivedAudits = filteredByOrg.filter(a => a.status === 'Archived');

        return (
            <Card className="min-h-[calc(100vh-15rem)] flex flex-col shadow-none border">
                <MainPageHeader 
                    title="Audits"
                    actions={
                        <Button asChild variant="outline" size={isMobile ? "compact" : "sm"} className="border-slate-300">
                            <Link href="/quality/audit-checklists">
                                < ShieldCheck className="h-4 w-4" /> 
                                {isMobile ? "Templates" : "Audit Templates"}
                            </Link>
                        </Button>
                    }
                />

                {shouldShowOrganizationTabs && (
                    <div className="border-b bg-muted/5 px-4 py-3 shrink-0">
                        {isMobile ? (
                            <Select value={activeOrgTab} onValueChange={setActiveOrgTab}>
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
                                    {organizations?.map((organization) => (
                                        <SelectItem key={organization.id} value={organization.id} className="text-[10px] font-bold uppercase">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-3.5 w-3.5" />
                                                {organization.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex w-max gap-2 pr-6 flex-nowrap">
                                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                                    <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">
                                        Internal
                                    </TabsTrigger>
                                    {organizations?.map((organization) => (
                                        <TabsTrigger
                                            key={organization.id}
                                            value={organization.id}
                                            className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all"
                                        >
                                            {organization.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        )}
                    </div>
                )}

                <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} className="flex-1 flex flex-col">
                    <div className='px-4 py-3 border-b bg-muted/5 shrink-0'>
                        {isMobile ? (
                            <Select value={activeStatusTab} onValueChange={setActiveStatusTab}>
                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active" className="text-[10px] font-bold uppercase">
                                        <div className="flex items-center gap-2">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            Active ({activeAudits.length})
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="archived" className="text-[10px] font-bold uppercase">
                                        <div className="flex items-center gap-2">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            Archived ({archivedAudits.length})
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex w-max gap-2 pr-6 flex-nowrap">
                                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                                    <TabsTrigger value="active" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-[10px] font-black uppercase shrink-0 transition-all">Active ({activeAudits.length})</TabsTrigger>
                                    <TabsTrigger value="archived" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-[10px] font-black uppercase shrink-0 transition-all">Archived ({archivedAudits.length})</TabsTrigger>
                                </TabsList>
                            </div>
                        )}
                    </div>
                    <CardContent className="p-0 flex-1">
                        <TabsContent value="active" className="m-0 p-4 lg:p-6">
                            <AuditsTable audits={activeAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                        <TabsContent value="archived" className="m-0 p-4 lg:p-6">
                            <AuditsTable audits={archivedAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-[1200px] mx-auto w-full px-1">
                <Skeleton className="h-14 w-full" />
                <Card className="shadow-none border">
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
            {!showTabs ? (
                renderOrgCard(scopedOrganizationId)
            ) : (
                <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex flex-col h-full overflow-hidden">
                    <div className="flex-1 min-h-0">
                        <TabsContent value="internal" className="m-0 p-0 h-full">
                            {renderOrgCard('internal')}
                        </TabsContent>
                        
                        {(organizations || []).map(org => (
                            <TabsContent key={org.id} value={org.id} className="m-0 p-0 h-full">
                                {renderOrgCard(org.id)}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            )}
        </div>
    )
}
