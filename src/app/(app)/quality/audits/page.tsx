'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardControlHeader, CARD_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS, HEADER_MOBILE_ACTION_BUTTON_CLASS } from "@/components/page-header";
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ListFilter, ChevronDown, PlayCircle, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useTabVisibility } from '@/hooks/use-tab-visibility';
import { usePageLayout } from '@/hooks/use-page-layout';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationTabsRow, ResponsiveTabRow } from '@/components/responsive-tab-row';
import { ArchiveActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Aircraft } from '@/types/aircraft';
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
    auditorName?: string;
    auditeeName?: string;
    targetName?: string;
    assetName?: string;
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
    const router = useRouter();
    const [isStarting, setIsStarting] = useState(false);

    const handleArchive = async () => {
        try {
            const response = await fetch(`/api/quality-audits?id=${encodeURIComponent(audit.id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to archive audit');
            window.dispatchEvent(new Event('safeviate-quality-updated'));
            toast({ title: "Audit Archived", description: `Audit #${audit.auditNumber} can be recalled from Archived.`});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    const handleRestore = async () => {
        const response = await fetch('/api/quality-audits', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: audit.id }) });
        if (!response.ok) throw new Error('Failed to recall audit');
        window.dispatchEvent(new Event('safeviate-quality-updated'));
        toast({ title: 'Audit Recalled', description: `Audit #${audit.auditNumber} is active again.` });
    };

    const handleStart = async () => {
        try {
            setIsStarting(true);
            const response = await fetch('/api/quality-audits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audit: {
                        ...audit,
                        status: 'In Progress',
                    },
                }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to start audit');
            }
            window.dispatchEvent(new Event('safeviate-quality-updated'));
            toast({ title: 'Audit Started', description: `Audit #${audit.auditNumber} is now in progress.` });
            router.push(`/quality/audits/${audit.id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Unable to start audit', description: error.message });
        } finally {
            setIsStarting(false);
        }
    };
    
    return (
        <div className="flex items-center justify-end gap-2">
            {audit.status === 'Scheduled' ? (
                <Button
                    variant="outline"
                    size="compact"
                    className="h-8 w-8 border-slate-300 p-0"
                    onClick={handleStart}
                    disabled={isStarting}
                    aria-label={isStarting ? 'Starting audit' : `Start audit ${audit.auditNumber}`}
                    title={isStarting ? 'Starting audit...' : 'Start audit'}
                >
                    <PlayCircle className="h-4 w-4" />
                    <span className="sr-only">{isStarting ? 'Starting audit' : 'Start audit'}</span>
                </Button>
            ) : null}
            <ViewActionButton href={`/quality/audits/${audit.id}`} iconOnly />
            {audit.status === 'Archived' ? (
                <Button variant="outline" size="compact" className="gap-2 border-slate-300" onClick={() => void handleRestore()}>
                    <ArchiveRestore className="h-4 w-4" /> Recall Audit
                </Button>
            ) : (
                <ArchiveActionButton
                    description={`Audit #${audit.auditNumber} will be moved to Archived. It will not be deleted and can be recalled later.`}
                    onArchive={() => void handleArchive()}
                    srLabel="Archive audit"
                />
            )}
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

    const groups = new Map<string, EnrichedAudit[]>();
    audits.forEach((audit) => {
        const group = audit.targetName || audit.auditeeName || audit.auditeeId || 'Unassigned department';
        groups.set(group, [...(groups.get(group) || []), audit]);
    });

    return (
        <div className="space-y-4 p-4 lg:p-6">
            {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, groupAudits]) => (
                <section key={group} className="overflow-hidden rounded-lg border bg-background shadow-none">
                    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground">{group}</p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{groupAudits.length} audit{groupAudits.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>
                    <div className="divide-y">
                        {groupAudits.sort((a, b) => b.auditDate.localeCompare(a.auditDate)).map((audit) => (
                            <div key={audit.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(200px,1.5fr)_minmax(100px,0.9fr)_minmax(90px,0.75fr)_minmax(110px,0.9fr)_minmax(60px,0.55fr)_112px] md:items-center lg:grid-cols-[minmax(200px,1.5fr)_minmax(120px,0.9fr)_minmax(110px,0.75fr)_minmax(120px,0.9fr)_minmax(72px,0.55fr)_112px]">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`/quality/audits/${audit.id}`} className="text-sm font-black uppercase text-foreground hover:underline">{audit.auditNumber}</Link>
                                        <Badge variant={getStatusBadgeVariant(audit.status)} className="h-5 px-2 text-[9px] font-black uppercase">{audit.status}</Badge>
                                    </div>
                                    <p className="mt-1 truncate text-sm font-semibold text-foreground">{audit.title}</p>
                                    <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{audit.scope || 'No scope recorded'}</p>
                                </div>
                                <div className="min-w-0 text-xs">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Auditee</span>
                                    <span className="block truncate font-semibold">{audit.auditeeName || '-'}</span>
                                </div>
                                <div className="min-w-0 text-xs">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Date</span>
                                    <span className="block truncate font-semibold">{format(parseLocalDate(audit.auditDate), 'dd MMM yyyy')}</span>
                                </div>
                                <div className="min-w-0 text-xs">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Auditor</span>
                                    <span className="block truncate font-semibold">{audit.auditorName || '-'}</span>
                                </div>
                                <div className="min-w-0 text-xs">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Asset</span>
                                    <span className="block truncate font-semibold">{audit.assetName || '-'}</span>
                                </div>
                                <AuditActions audit={audit} tenantId={tenantId} />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

export default function AuditsPage() {
    const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/audits' });
    const { tenantId, userProfile } = useUserProfile();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-audits-view-all' });
    const { isPageEnabled, isSectionEnabled, isTabEnabled } = usePageLayout('audits');
    const isMobile = useIsMobile();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeOrgTab, setActiveOrgTab] = useState('internal');
    const [activeStatusTab, setActiveStatusTab] = useState('active');
    const activeTab = pathname?.startsWith('/quality/audits') ? 'audits' : 'checklists';

    const [audits, setAudits] = useState<QualityAudit[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
    const [aircraft, setAircraft] = useState<Aircraft[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const currentUserIdentityLabel = userProfile?.email?.trim() || userProfile?.id || '';

    const loadData = async () => {
        try {
            const response = await fetch('/api/quality-audits', { cache: 'no-store' });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Unable to load tenant audit data.');
            }
            setAudits(Array.isArray(payload.audits) ? payload.audits : []);
            setPersonnel(Array.isArray(payload.personnel) ? payload.personnel : []);
            setDepartments(Array.isArray(payload.departments) ? payload.departments : []);
            setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
            setAircraft(Array.isArray(payload.aircraft) ? payload.aircraft : []);
            setLoadError(null);
        } catch (e) {
            console.error('Failed to load quality data', e);
            setLoadError(e instanceof Error ? e.message : 'Unable to load tenant audit data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
        window.addEventListener('safeviate-quality-updated', loadData);
        return () => window.removeEventListener('safeviate-quality-updated', loadData);
    }, []);

    useEffect(() => {
        const requestedOrg = searchParams?.get('org');
        setActiveOrgTab(requestedOrg || scopedOrganizationId);
    }, [scopedOrganizationId, searchParams]);

    const handleOrganizationChange = (value: string) => {
        setActiveOrgTab(value);
        const nextPath = pathname || '/quality/audits';
        router.replace(`${nextPath}?org=${encodeURIComponent(value)}`);
    };

    const showTabs = useTabVisibility('audits', shouldShowOrganizationTabs);
    const showOrgTabs = showTabs && isSectionEnabled('organization-scope');
    const showStatusTabs = isSectionEnabled('audit-status');
    const statusTabs = [
      { value: 'active', label: `Active (${audits.filter((audit) => audit.status !== 'Archived').length})` },
      { value: 'archived', label: `Archived (${audits.filter((audit) => audit.status === 'Archived').length})` },
    ].filter((tab) => showStatusTabs && isTabEnabled(tab.value));

    useEffect(() => {
        if (statusTabs.length === 0) return;
        if (!statusTabs.some((tab) => tab.value === activeStatusTab)) {
            setActiveStatusTab(statusTabs[0].value);
        }
    }, [activeStatusTab, statusTabs]);

    if (!isAccessLoading && !isAllowed) {
        return <TenantLayoutDisabledState />;
    }

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

    const enrichedAudits = useMemo((): EnrichedAudit[] => {
        if (!audits || !personnel || !departments || !organizations) return [];

        const personnelMap = new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
        const departmentMap = new Map(departments.map(d => [d.id, d.name]));
        const orgMap = new Map(organizations.map(o => [o.id, o.name]));
        const aircraftMap = new Map(aircraft.map((item) => [item.id, item.tailNumber]));
        const currentPersonnelProfile = userProfile?.email
          ? personnel.find((person) => (person.email || '').trim().toLowerCase() === userProfile.email.trim().toLowerCase()) || null
          : null;
        const activeAuditorId = currentPersonnelProfile?.id || userProfile?.id || '';

        return audits.map(audit => ({
            ...audit,
            auditorName:
              ((activeAuditorId && audit.auditorId === activeAuditorId) ? currentUserIdentityLabel : '') ||
              (/^vercel-seed-/i.test((audit.auditorId || '').trim()) ? currentUserIdentityLabel : '') ||
              audit.auditorName?.trim() ||
              personnelMap.get(audit.auditorId) ||
              audit.auditorId ||
              '',
            auditeeName:
              audit.auditeeName?.trim() ||
              personnelMap.get(audit.auditeeId) ||
              audit.auditeeId ||
              '',
            targetName:
              audit.targetName?.trim() ||
              orgMap.get(audit.organizationId || '') ||
              orgMap.get(audit.targetId || '') ||
              departmentMap.get(audit.targetId || '') ||
              personnelMap.get(audit.targetId || '') ||
              departmentMap.get(audit.auditeeId) ||
              personnelMap.get(audit.auditeeId) ||
              audit.targetId ||
              '',
            assetName: aircraftMap.get(audit.assetId || '') || '',
        }));
    }, [aircraft, audits, currentUserIdentityLabel, departments, organizations, personnel, userProfile?.email, userProfile?.id]);

    const renderOrgContent = (orgId: string | 'internal') => {
        const filteredByOrg = enrichedAudits.filter(a => 
            orgId === 'internal' ? !a.organizationId : a.organizationId === orgId
        );

        const activeAudits = filteredByOrg.filter(a => a.status !== 'Archived');
        const archivedAudits = filteredByOrg.filter(a => a.status === 'Archived');

        if (!showStatusTabs || statusTabs.length === 0) {
            return (
                <div className="overflow-y-auto p-4 lg:p-6">
                    <AuditsTable audits={filteredByOrg} tenantId={tenantId || ''} />
                </div>
            );
        }

        return (
            <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {statusTabs.length > 1 ? (
                  <ResponsiveTabRow
                      value={activeStatusTab}
                      onValueChange={setActiveStatusTab}
                      placeholder="Filter Status"
                      centerTabs
                      className="px-3 py-2 border-b border-card-border/70 bg-muted/5 shrink-0 md:px-4"
                      options={statusTabs.map((tab) => ({
                          ...tab,
                          icon: ListFilter,
                      }))}
                  />
                ) : null}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {isTabEnabled('active') ? (
                      <TabsContent value="active" className="m-0 p-4 pb-6 lg:p-6 lg:pb-8">
                          <AuditsTable audits={activeAudits} tenantId={tenantId || ''} />
                      </TabsContent>
                    ) : null}
                    {isTabEnabled('archived') ? (
                      <TabsContent value="archived" className="m-0 p-4 pb-6 lg:p-6 lg:pb-8">
                          <AuditsTable audits={archivedAudits} tenantId={tenantId || ''} />
                      </TabsContent>
                    ) : null}
                </div>
            </Tabs>
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-[1100px] mx-auto w-full flex flex-col gap-6 h-full px-1 pt-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    return (
        <div className={cn("max-w-[1100px] mx-auto w-full flex flex-col gap-4 px-1 pt-4", isMobile ? "min-h-0 overflow-y-auto" : "h-full min-h-0 overflow-hidden")}>
            <Card className={cn("flex flex-col shadow-none border", isMobile ? "min-h-0 overflow-visible" : "h-full min-h-0 overflow-hidden")}>
                <CardControlHeader
                    className="main-page-header flex w-full shrink-0 flex-col bg-[hsl(var(--card-header-band-background))]"
                    isMobile={false}
                    context={showTabs && showOrgTabs ? (
                        <div className="flex min-w-0 items-center">
                            <OrganizationTabsRow
                                organizations={organizations || []}
                                activeTab={activeOrgTab}
                                onTabChange={handleOrganizationChange}
                                className="border-0 bg-transparent px-0 py-0"
                            />
                        </div>
                    ) : undefined}
                    actions={
                        <div className="main-page-header__actions flex w-full flex-wrap items-center justify-end gap-1.5 [&_button]:h-8 [&_button]:gap-1.5 [&_button]:px-3 [&_button]:text-[9px] [&_button]:tracking-[0.08em] [&_a]:h-8 [&_a]:gap-1.5 [&_a]:px-3 [&_a]:text-[9px] [&_a]:tracking-[0.08em]">
                            <Button
                                asChild
                                variant={isMobile ? 'outline' : 'default'}
                                className={isMobile ? HEADER_MOBILE_ACTION_BUTTON_CLASS : HEADER_ACTION_BUTTON_CLASS}
                            >
                                <Link href="/quality/audit-checklists">
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Audit Templates
                                    </span>
                                    {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                                </Link>
                            </Button>
                        </div>
                    }
                />
                <div className={CARD_HEADER_BAND_CLASS}>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            asChild
                            variant={activeTab === 'checklists' ? 'default' : 'outline'}
                            className={HEADER_COMPACT_CONTROL_CLASS}
                        >
                            <Link href={`/quality/audit-checklists?org=${encodeURIComponent(activeOrgTab)}`}>Audit Checklists</Link>
                        </Button>
                        <Button
                            asChild
                            variant={activeTab === 'audits' ? 'default' : 'outline'}
                            className={HEADER_COMPACT_CONTROL_CLASS}
                        >
                            <Link href={`/quality/audits?org=${encodeURIComponent(activeOrgTab)}`}>Audits</Link>
                        </Button>
                    </div>
                </div>
                <CardContent className={cn("flex-1 min-h-0 p-0 bg-muted/5", isMobile ? "overflow-y-auto" : "overflow-y-auto")}>
                    {loadError ? (
                        <div role="alert" className="mx-4 mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {loadError}
                        </div>
                    ) : null}
                    {!showTabs || !showOrgTabs ? (
                        renderOrgContent(scopedOrganizationId)
                    ) : (
                        renderOrgContent(activeOrgTab)
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
