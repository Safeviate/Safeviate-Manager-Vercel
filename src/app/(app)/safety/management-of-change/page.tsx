'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import type { ManagementOfChange } from '@/types/moc';
import type { ExternalOrganization } from '@/types/quality';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { MocActions } from './moc-actions';
import { CARD_HEADER_BAND_CLASS, HEADER_COMPACT_CONTROL_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { OrganizationTabsRow } from '@/components/responsive-tab-row';
import { useCallback, useEffect, useState } from 'react';
import { parseJsonResponse } from '@/lib/safe-json';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return new Date(value);
    }
    return new Date(year, month - 1, day, 12);
};

export default function ManagementOfChangePage() {
    const { hasPermission } = usePermissions();
    const { tenantId } = useUserProfile();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'moc-manage' });
    const isMobile = useIsMobile();
    const [activeOrgTab, setActiveOrgTab] = useState('internal');
    const [mocs, setMocs] = useState<ManagementOfChange[]>([]);
    const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
    const [isLoadingMocs, setIsLoadingMocs] = useState(true);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const canViewAll = hasPermission('moc-manage');
    const mocProposeButtonClass = cn(
        HEADER_SECONDARY_BUTTON_CLASS,
        HEADER_COMPACT_CONTROL_CLASS,
        'min-w-[160px] justify-between px-3',
    );

    const load = useCallback(async () => {
        let cancelled = false;
        try {
            if (!tenantId) {
                setIsLoadingMocs(false);
                setIsLoadingOrgs(false);
                return;
            }

            setIsLoadingMocs(true);
            setIsLoadingOrgs(true);
            setError(null);
            const response = await fetch('/api/management-of-change', { cache: 'no-store' });
            const payload = await parseJsonResponse<{ mocs?: ManagementOfChange[]; organizations?: ExternalOrganization[] }>(response);
            if (cancelled) return;
            setMocs(payload?.mocs ?? []);
            setOrganizations(payload?.organizations ?? []);
        } catch (err) {
            if (!cancelled) setError(err instanceof Error ? err : new Error('Unable to load MOC records.'));
        } finally {
            if (!cancelled) {
                setIsLoadingMocs(false);
                setIsLoadingOrgs(false);
            }
        }
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    useEffect(() => {
        void load();
        window.addEventListener('safeviate-mocs-updated', load);
        return () => {
            window.removeEventListener('safeviate-mocs-updated', load);
        };
    }, [load]);

    const isLoading = isLoadingMocs || isLoadingOrgs;

    const renderOrgCard = (orgId: string | 'internal') => {
        const filteredMocs = (mocs || []).filter(moc =>
            orgId === 'internal' ? !moc.organizationId : moc.organizationId === orgId
        );
        const headerBandBorderStyle = { borderBottomColor: 'hsl(var(--card-border))' };

        const proposeChangeAction = canViewAll && (
            isMobile ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-11 w-auto min-w-[160px] flex justify-between items-center px-4 border-slate-200 bg-white font-black uppercase text-[11px] tracking-tight shadow-sm"
                        >
                            <div className="flex items-center gap-2">
                                <PlusCircle className="h-4 w-4" />
                                <span>Propose</span>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        <DropdownMenuItem asChild>
                            <Link href={`/safety/management-of-change/new?orgId=${orgId}`}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Propose New Change
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button
                    asChild
                    className={mocProposeButtonClass}
                >
                    <Link href={`/safety/management-of-change/new?orgId=${orgId}`}>
                        <PlusCircle className="h-4 w-4" />
                        Propose Change
                    </Link>
                </Button>
            )
        );

        return (
            <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl max-w-[1200px] w-full mx-auto">
                <div className={cn('flex items-center justify-between gap-3 bg-muted/5', CARD_HEADER_BAND_CLASS)} style={headerBandBorderStyle}>
                    <div className="min-w-0 shrink-0">
                        {shouldShowOrganizationTabs && (
                            <OrganizationTabsRow
                                organizations={organizations || []}
                                activeTab={activeOrgTab}
                                onTabChange={setActiveOrgTab}
                                className="border-0 bg-transparent px-0 py-0 shrink-0"
                            />
                        )}
                    </div>
                    <div className="shrink-0">
                        {proposeChangeAction}
                    </div>
                </div>

                <CardContent className="flex-1 p-0 overflow-auto bg-background">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-foreground/90">MOC #</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-foreground/90">Title</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-foreground/90">Status</TableHead>
                                <TableHead className={cn("text-[10px] uppercase font-bold tracking-wider text-foreground/90", isMobile && "hidden")}>Proposed</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider text-foreground/90">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMocs.length > 0 ? (
                                filteredMocs.map(moc => (
                                    <TableRow key={moc.id}>
                                        <TableCell className="font-bold text-sm text-primary">{moc.mocNumber}</TableCell>
                                        <TableCell className="text-sm font-medium">{moc.title}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase border-primary/20 bg-primary/5 text-primary">{moc.status}</Badge></TableCell>
                                        <TableCell className={cn("text-sm font-medium whitespace-nowrap", isMobile && "hidden")}>{format(parseLocalDate(moc.proposalDate), 'dd MMM yy')}</TableCell>
                                        <TableCell className="text-right text-foreground">
                                            <MocActions moc={moc} tenantId={tenantId || ''} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isMobile ? 4 : 5} className="h-48 text-center text-muted-foreground italic text-sm">
                                        No MOC records found for this company.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-[1200px] mx-auto w-full space-y-6 pt-4 px-1">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1200px] mx-auto w-full text-center py-20 px-1">
                <p className="text-muted-foreground">Error loading records: {error.message}</p>
            </div>
        );
    }

    const showTabs = shouldShowOrganizationTabs;

    return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-4 px-1">
            {!showTabs ? (
                renderOrgCard(scopedOrganizationId)
            ) : (
                <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex-1 flex flex-col overflow-hidden">
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
    );
}
