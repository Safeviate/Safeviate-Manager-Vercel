'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
<<<<<<< HEAD
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
=======
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
>>>>>>> temp-save-work
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
import { Eye, Trash2, Calendar, ClipboardCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useTabVisibility } from '@/hooks/use-tab-visibility';
import { cn } from '@/lib/utils';

import type { QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';
<<<<<<< HEAD
import { ScrollArea } from '@/components/ui/scroll-area';
import { MainPageHeader } from '@/components/page-header';
=======
>>>>>>> temp-save-work

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
<<<<<<< HEAD
            <Button asChild variant="outline" size="sm" className="h-8 gap-2 border-slate-300">
=======
            <Button asChild variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase">
>>>>>>> temp-save-work
                <Link href={`/quality/audits/${audit.id}`}>
                    <Eye className="h-4 w-4" />
                    View
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
<<<<<<< HEAD
        return <div className="text-center p-12 text-muted-foreground text-sm italic font-medium">No audits found for this context.</div>
=======
        return <div className="text-center p-8 text-muted-foreground text-sm italic uppercase font-bold tracking-widest bg-muted/5">No audits found for this context.</div>
>>>>>>> temp-save-work
    }

    return (
        <div className="flex flex-col h-full">
            {/* --- DESKTOP VIEW --- */}
            <div className="hidden lg:block overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Audit ID</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Date</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Title</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Auditee</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">Score</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {audits.map(audit => (
                            <TableRow key={audit.id}>
                                <TableCell className="font-bold text-sm text-primary">
                                    <Link href={`/quality/audits/${audit.id}`} className="hover:underline">{audit.auditNumber}</Link>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm font-medium">{format(new Date(audit.auditDate), 'dd MMM yy')}</TableCell>
<<<<<<< HEAD
                                <TableCell className="text-sm font-medium max-w-[200px] truncate">{audit.title}</TableCell>
=======
                                <TableCell className="text-sm font-bold max-w-[200px] truncate">{audit.title}</TableCell>
>>>>>>> temp-save-work
                                <TableCell className="text-sm font-medium">{audit.auditeeName || audit.auditeeId}</TableCell>
                                <TableCell className="text-center">
                                    {audit.complianceScore !== undefined ? (
                                        <Badge variant="outline" className={cn(
<<<<<<< HEAD
                                            "font-mono font-black text-[10px] h-6",
=======
                                            "font-black text-[10px] uppercase py-0.5 px-2",
>>>>>>> temp-save-work
                                            audit.complianceScore >= 80 ? "text-green-600 border-green-600 bg-green-50" : 
                                            audit.complianceScore >= 60 ? "text-yellow-600 border-yellow-600 bg-yellow-50" : 
                                            "text-red-600 border-red-600 bg-red-50"
                                        )}>
                                            {audit.complianceScore}%
                                        </Badge>
                                    ) : <span className="text-muted-foreground opacity-30">—</span>}
                                </TableCell>
<<<<<<< HEAD
                                <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-300">{audit.status}</Badge></TableCell>
=======
                                <TableCell><Badge variant={getStatusBadgeVariant(audit.status)} className="text-[10px] font-black uppercase py-0.5">{audit.status}</Badge></TableCell>
>>>>>>> temp-save-work
                                <TableCell className="text-right">
                                <AuditActions audit={audit} tenantId={tenantId} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4">
                {audits.map(audit => (
<<<<<<< HEAD
                    <Card key={audit.id} className="shadow-none border-slate-200 overflow-hidden bg-muted/5">
=======
                    <Card key={audit.id} className="shadow-none border-slate-200 overflow-hidden">
>>>>>>> temp-save-work
                        <div className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{audit.auditNumber}</span>
                                <span className="text-sm font-black mt-1 line-clamp-1">{audit.title}</span>
                            </div>
                            <Badge variant="outline" className="h-5 text-[9px] font-black uppercase border-slate-300 bg-background">
                                {audit.status}
                            </Badge>
                        </div>
                        <CardContent className="p-4 py-3 space-y-3">
                            <div className="flex justify-between items-center">
<<<<<<< HEAD
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
=======
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase">
>>>>>>> temp-save-work
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(audit.auditDate), 'dd MMM yyyy')}
                                </div>
                                {audit.complianceScore !== undefined && (
<<<<<<< HEAD
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Score:</span>
=======
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase">Score:</span>
>>>>>>> temp-save-work
                                        <span className={cn(
                                            "font-black text-sm",
                                            audit.complianceScore >= 80 ? "text-green-600" : 
                                            audit.complianceScore >= 60 ? "text-yellow-600" : 
                                            "text-red-600"
                                        )}>{audit.complianceScore}%</span>
                                    </div>
                                )}
                            </div>
<<<<<<< HEAD
                            <div className="flex items-center gap-2 text-xs font-bold">
=======
                            <div className="flex items-center gap-2 text-xs font-bold uppercase">
>>>>>>> temp-save-work
                                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                Auditee: <span className="font-medium text-foreground">{audit.auditeeName || audit.auditeeId}</span>
                            </div>
<<<<<<< HEAD
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Scope: <span className="text-foreground normal-case font-bold">{audit.scope}</span></p>
                        </CardContent>
                        <div className="p-2 border-t bg-muted/5">
                            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-black uppercase h-8 px-4">
=======
                            <p className="text-[10px] uppercase font-black text-muted-foreground">Scope: <span className="text-foreground normal-case font-medium">{audit.scope}</span></p>
                        </CardContent>
                        <CardFooter className="p-2 border-t bg-muted/5">
                            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase h-8 px-4">
>>>>>>> temp-save-work
                                <Link href={`/quality/audits/${audit.id}`}>
                                    Review Findings & CAPs
                                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

<<<<<<< HEAD
function CompanyTabsRow({ organizations }: { organizations: ExternalOrganization[] }) {
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

=======
>>>>>>> temp-save-work
export default function AuditsPage() {
    const firestore = useFirestore();
    const { tenantId } = useUserProfile();
    const { hasPermission } = usePermissions();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-audits-view-all' });

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
<<<<<<< HEAD
            <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
                <div className="sticky top-0 z-30 bg-card">
                    <MainPageHeader 
                        title="Quality Assurance Audits"
                        description="Monitor organizational compliance and oversight activities."
                        actions={
                            <Button asChild variant="outline" size="sm" className="h-9 px-4 text-xs font-black uppercase gap-2 border-slate-300 shadow-sm">
                                <Link href="/quality/audit-checklists">
                                    <ShieldCheck className="h-4 w-4" /> Templates
                                </Link>
                            </Button>
                        }
                    />
                    {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
                </div>

                <Tabs defaultValue="active" className="flex-1 flex flex-col overflow-hidden">
                    <div className='px-6 py-2 border-b bg-muted/5 shrink-0'>
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 overflow-x-auto no-scrollbar w-full flex items-center">
                            <TabsTrigger 
                                value="active" 
                                className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                            >
                                Active ({activeAudits.length})
                            </TabsTrigger>
                            <TabsTrigger 
                                value="archived" 
                                className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                            >
                                Archived ({archivedAudits.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <CardContent className="flex-1 p-0 overflow-auto bg-background">
                        <TabsContent value="active" className="m-0 h-full">
                            <AuditsTable audits={activeAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                        <TabsContent value="archived" className="m-0 h-full">
=======
            <Card className="min-h-[calc(100vh-15rem)] flex flex-col shadow-none border">
                <MainPageHeader 
                    title="Audits"
                    actions={
                        <Button asChild variant="outline" size="sm" className="h-9 px-4 text-xs font-black uppercase gap-2 border-slate-300">
                            <Link href="/quality/audit-checklists">
                                <ShieldCheck className="h-4 w-4" /> Audit Templates
                            </Link>
                        </Button>
                    }
                />

                {shouldShowOrganizationTabs && (
                    <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar">
                        <div className="flex w-max gap-2 pr-6 flex-nowrap">
                            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                                <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase">
                                    Internal
                                </TabsTrigger>
                                {organizations?.map((organization) => (
                                    <TabsTrigger
                                        key={organization.id}
                                        value={organization.id}
                                        className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase"
                                    >
                                        {organization.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="active" className="flex-1 flex flex-col">
                    <div className='px-6 py-3 border-b bg-muted/5 overflow-x-auto no-scrollbar'>
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                            <TabsTrigger value="active" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-[10px] font-black uppercase shrink-0">Active ({activeAudits.length})</TabsTrigger>
                            <TabsTrigger value="archived" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-[10px] font-black uppercase shrink-0">Archived ({archivedAudits.length})</TabsTrigger>
                        </TabsList>
                    </div>
                    <CardContent className="p-0 flex-1">
                        <TabsContent value="active" className="m-0 p-4 lg:p-6">
                            <AuditsTable audits={activeAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                        <TabsContent value="archived" className="m-0 p-4 lg:p-6">
>>>>>>> temp-save-work
                            <AuditsTable audits={archivedAudits} tenantId={tenantId || 'safeviate'} />
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        );
    };

    if (isLoading) {
        return (
<<<<<<< HEAD
            <div className="space-y-6 max-w-[1400px] mx-auto w-full pt-4 px-1">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-[500px] w-full" />
=======
            <div className="space-y-6 max-w-[1200px] mx-auto w-full px-1">
                <Skeleton className="h-14 w-full" />
                <Card className="shadow-none border">
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
>>>>>>> temp-save-work
            </div>
        );
    }

    return (
<<<<<<< HEAD
        <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
=======
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
>>>>>>> temp-save-work
            {!showTabs ? (
                renderOrgCard(scopedOrganizationId)
            ) : (
                <Tabs defaultValue="internal" className="w-full flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden">
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
