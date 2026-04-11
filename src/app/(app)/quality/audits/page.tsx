'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ListFilter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useTabVisibility } from '@/hooks/use-tab-visibility';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationTabsRow, ResponsiveTabRow } from '@/components/responsive-tab-row';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_MOBILE_ACTION_BUTTON_CLASS } from '@/components/page-header';

import type { QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return new Date(value);
    }
    return new Date(year, month - 1, day, 12);
};

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
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/quality-audits?id=${encodeURIComponent(audit.id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete audit');
            window.dispatchEvent(new Event('safeviate-quality-updated'));
            toast({ title: "Audit Deleted", description: `Audit #${audit.auditNumber} has been removed.`});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }
    
    return (
        <div className="flex items-center justify-end gap-2">
            <ViewActionButton href={`/quality/audits/${audit.id}`} />
            <DeleteActionButton
                description={`This will permanently delete audit #${audit.auditNumber}.`}
                onDelete={handleDelete}
                srLabel="Delete audit"
            />
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
                                <TableCell className="whitespace-nowrap text-xs font-medium">{format(parseLocalDate(audit.auditDate), 'dd MMM yy')}</TableCell>
                                <TableCell className="text-xs font-bold max-w-[150px] truncate">{audit.title}</TableCell>
                                <TableCell className="text-xs font-medium hidden sm:table-cell">{audit.auditeeName || audit.auditeeId}</TableCell>
                                <TableCell className="text-center">
                                    {audit.complianceScore !== undefined ? (
                                        <Badge variant="outline" className={cn(
                                            "font-black text-[9px] uppercase py-0.5 px-2",
                                            audit.complianceScore >= 80 ? "text-primary border-primary/40 bg-primary/10" : 
                                            audit.complianceScore >= 60 ? "text-foreground border-border bg-muted" : 
                                            "text-destructive border-destructive/40 bg-destructive/10"
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
    const { tenantId } = useUserProfile();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-audits-view-all' });
    const isMobile = useIsMobile();
    const [activeOrgTab, setActiveOrgTab] = useState('internal');
    const [activeStatusTab, setActiveStatusTab] = useState('active');

    const [audits, setAudits] = useState<QualityAudit[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        try {
            const response = await fetch('/api/quality-audits', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({ audits: [], personnel: [], departments: [], organizations: [] }));
            setAudits(Array.isArray(payload.audits) ? payload.audits : []);
            setPersonnel(Array.isArray(payload.personnel) ? payload.personnel : []);
            setDepartments(Array.isArray(payload.departments) ? payload.departments : []);
            setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
        } catch (e) {
            console.error('Failed to load quality data', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
        window.addEventListener('safeviate-quality-updated', loadData);
        return () => window.removeEventListener('safeviate-quality-updated', loadData);
    }, []);

    const showTabs = useTabVisibility('audits', shouldShowOrganizationTabs);

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
            <Card className="h-full min-h-0 flex flex-col overflow-hidden shadow-none border">
                <MainPageHeader 
                    title="Audits"
                    actions={
                        <Button
                          asChild
                          variant="outline"
                          size={isMobile ? "compact" : "sm"}
                          className={isMobile ? HEADER_MOBILE_ACTION_BUTTON_CLASS : HEADER_ACTION_BUTTON_CLASS}
                      >
                            <Link href="/quality/audit-checklists">
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> 
                                    {isMobile ? "Templates" : "Audit Templates"}
                                </span>
                                {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                            </Link>
                        </Button>
                    }
                />

                {shouldShowOrganizationTabs && (
                    <OrganizationTabsRow
                        organizations={organizations || []}
                        activeTab={activeOrgTab}
                        onTabChange={setActiveOrgTab}
                        className="px-4 py-3 border-b bg-muted/5 shrink-0 md:px-6"
                    />
                )}

                <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <ResponsiveTabRow
                        value={activeStatusTab}
                        onValueChange={setActiveStatusTab}
                        placeholder="Filter Status"
                        className="px-4 py-3 border-b bg-muted/5 shrink-0 md:px-6"
                        options={[
                            { value: 'active', label: `Active (${activeAudits.length})`, icon: ListFilter },
                            { value: 'archived', label: `Archived (${archivedAudits.length})`, icon: ListFilter },
                        ]}
                    />
                    <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                        <TabsContent value="active" className="m-0 p-4 lg:p-6">
                            <AuditsTable audits={activeAudits} tenantId={tenantId || ''} />
                        </TabsContent>
                        <TabsContent value="archived" className="m-0 p-4 lg:p-6">
                            <AuditsTable audits={archivedAudits} tenantId={tenantId || ''} />
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
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
            {!showTabs ? (
                renderOrgCard(scopedOrganizationId)
            ) : (
                <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex flex-col h-full overflow-hidden">
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
