'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
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
import { MocActions } from './moc-actions';
import type { TabVisibilitySettings } from '../../admin/external/page';

export default function ManagementOfChangePage() {
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const { tenantId, userProfile } = useUserProfile();

    const canViewAll = hasPermission('moc-manage');
    const userOrgId = userProfile?.organizationId;

    const mocsQuery = useMemoFirebase(
        () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/management-of-change`), orderBy('proposalDate', 'desc')) : null),
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

    const { data: mocs, isLoading: isLoadingMocs, error } = useCollection<ManagementOfChange>(mocsQuery);
    const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
    const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

    const isLoading = isLoadingMocs || isLoadingOrgs || isLoadingVisibility;

    const renderOrgContext = (orgId: string | 'internal') => {
        const filteredMocs = (mocs || []).filter(moc => 
            orgId === 'internal' ? !moc.organizationId : moc.organizationId === orgId
        );

        return (
            <Card className="min-h-[400px] flex flex-col shadow-none border">
                <CardHeader className="bg-muted/10 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{orgId === 'internal' ? 'Internal Management of Change' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                            <CardDescription>Formal change management process for this organization.</CardDescription>
                        </div>
                        {canViewAll && (
                            <Button asChild size="sm">
                                <Link href={`/safety/management-of-change/new?orgId=${orgId}`}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Propose Change
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
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
            <div className="max-w-6xl mx-auto w-full space-y-6">
                <Skeleton className="h-10 w-[400px] rounded-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="max-w-6xl mx-auto w-full text-center py-10 text-destructive"><p>Error loading records: {error.message}</p></div>;
    }

    const isTabEnabled = visibilitySettings?.visibilities?.['moc'] ?? true;
    const showTabs = isTabEnabled && canViewAll;

    return (
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 h-full">
            <div className="px-1">
                <h1 className="text-3xl font-bold tracking-tight">Management of Change</h1>
                <p className="text-muted-foreground">Formally manage and identify risks associated with significant organizational changes.</p>
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
    );
}