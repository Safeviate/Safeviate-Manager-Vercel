'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ManagementOfChange } from '@/types/moc';
import type { ExternalOrganization } from '@/types/quality';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { MocActions } from './moc-actions';

export default function ManagementOfChangePage() {
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const { tenantId } = useUserProfile();
    const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'moc-manage' });

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
        const companyName = orgId === 'internal'
            ? 'Internal Management of Change'
            : organizations?.find((o) => o.id === orgId)?.name;

        return (
            <Card className="shadow-none border">
                <CardHeader className="bg-muted/10 border-b flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-6">
                    <div>
                        <CardTitle className="text-2xl font-headline">{companyName}</CardTitle>
                        <CardDescription>Formal change management process for this organization.</CardDescription>
                    </div>
                    {canViewAll && (
                        <div className="flex flex-col gap-1.5 xl:items-end w-full md:w-auto">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Change Control</p>
                            <Button asChild size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2">
                                <Link href={`/safety/management-of-change/new?orgId=${orgId}`}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Propose Change
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardHeader>
                {shouldShowOrganizationTabs && (
                    <div className="border-b px-6 py-4">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex min-w-max">
                            <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Internal</TabsTrigger>
                            {(organizations || []).map((organization) => (
                                <TabsTrigger
                                    key={organization.id}
                                    value={organization.id}
                                    className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0"
                                >
                                    {organization.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                )}
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs uppercase font-bold">MOC #</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Title</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Status</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Proposed</TableHead>
                                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMocs.length > 0 ? (
                                filteredMocs.map(moc => (
                                    <TableRow key={moc.id}>
                                        <TableCell className="font-medium text-xs">{moc.mocNumber}</TableCell>
                                        <TableCell className="text-xs">{moc.title}</TableCell>
                                        <TableCell><Badge variant="secondary" className="text-[10px] py-0">{moc.status}</Badge></TableCell>
                                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(moc.proposalDate), 'dd MMM yy')}</TableCell>
                                        <TableCell className="text-right">
                                            <MocActions moc={moc} tenantId={tenantId || 'safeviate'} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-sm">
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
            <div className="max-w-[1200px] mx-auto w-full space-y-6">
                <Skeleton className="h-10 w-[400px] rounded-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="max-w-[1200px] mx-auto w-full text-center py-10 text-destructive"><p>Error loading records: {error.message}</p></div>;
    }

    const showTabs = shouldShowOrganizationTabs;

    return (
        <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
            {!showTabs ? (
                renderOrgCard(scopedOrganizationId)
            ) : (
                <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                        <TabsContent value="internal" className="m-0 p-0">
                            {renderOrgCard('internal')}
                        </TabsContent>
                        
                        {(organizations || []).map(org => (
                            <TabsContent key={org.id} value={org.id} className="m-0 p-0">
                                {renderOrgCard(org.id)}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            )}
        </div>
    );
}
