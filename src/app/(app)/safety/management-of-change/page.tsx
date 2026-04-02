'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
import { MainPageHeader } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { OrganizationTabsRow } from '@/components/responsive-tab-row';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ManagementOfChangePage() {
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const { tenantId } = useUserProfile();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'moc-manage' });
    const isMobile = useIsMobile();
    const [activeOrgTab, setActiveOrgTab] = useState('internal');

    const canViewAll = hasPermission('moc-manage');

    const mocsQuery = useMemoFirebase(
        () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/management-of-change`), orderBy('proposalDate', 'desc')) : null),
        [firestore, tenantId]
    );

    const orgsQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
        [firestore, tenantId]
    );

    const { data: mocs, isLoading: isLoadingMocs, error } = useCollection<ManagementOfChange>(mocsQuery);
    const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

    const isLoading = isLoadingMocs || isLoadingOrgs;

    const renderOrgCard = (orgId: string | 'internal') => {
        const filteredMocs = (mocs || []).filter(moc =>
            orgId === 'internal' ? !moc.organizationId : moc.organizationId === orgId
        );

        return (
            <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
                <MainPageHeader
                    title="Management of Change"
                    description="Formal process for evaluating and managing changes to operations or procedures."
                    actions={
                        canViewAll && (
                            isMobile ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-11 flex justify-between items-center px-4 border-slate-200 bg-white font-black uppercase text-[11px] tracking-tight shadow-sm"
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
                                    size="sm"
                                    className="w-full sm:w-auto h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2"
                                >
                                    <Link href={`/safety/management-of-change/new?orgId=${orgId}`}>
                                        <PlusCircle className="h-4 w-4" />
                                        Propose Change
                                    </Link>
                                </Button>
                            )
                        )
                    }
                />

                {shouldShowOrganizationTabs && (
                    <OrganizationTabsRow organizations={organizations || []} activeTab={activeOrgTab} onTabChange={setActiveOrgTab} />
                )}

                <CardContent className="flex-1 p-0 overflow-auto bg-background">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">MOC #</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Title</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                                <TableHead className={cn("text-[10px] uppercase font-bold tracking-wider", isMobile && "hidden")}>Proposed</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMocs.length > 0 ? (
                                filteredMocs.map(moc => (
                                    <TableRow key={moc.id}>
                                        <TableCell className="font-bold text-sm text-primary">{moc.mocNumber}</TableCell>
                                        <TableCell className="text-sm font-medium">{moc.title}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase border-primary/20 bg-primary/5 text-primary">{moc.status}</Badge></TableCell>
                                        <TableCell className={cn("text-sm font-medium whitespace-nowrap", isMobile && "hidden")}>{format(new Date(moc.proposalDate), 'dd MMM yy')}</TableCell>
                                        <TableCell className="text-right">
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
            <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
                <p className="text-muted-foreground">Error loading records: {error.message}</p>
            </div>
        );
    }

    const showTabs = shouldShowOrganizationTabs;

    return (
        <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
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
