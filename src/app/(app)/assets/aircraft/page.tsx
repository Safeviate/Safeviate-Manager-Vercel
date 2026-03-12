
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft } from '@/types/aircraft';
import type { ExternalOrganization } from '@/types/quality';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const canEdit = hasPermission('assets-edit');
  const canViewAll = hasPermission('assets-view'); // Simplified for MVP scoping
  const userOrgId = userProfile?.organizationId;

  const aircraftQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber')) : null),
    [firestore, tenantId]
  );

  const orgsQuery = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
    [firestore, tenantId]
  );

  const { data: allAircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

  const isLoading = isLoadingAircraft || isLoadingOrgs;

  const renderOrgContext = (orgId: string | 'internal') => {
    const contextOrgId = orgId === 'internal' ? null : orgId;
    const filteredAircraft = (allAircraft || []).filter(ac => 
        orgId === 'internal' ? !ac.organizationId : ac.organizationId === orgId
    );

    return (
        <Card className="min-h-[400px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{orgId === 'internal' ? 'Internal Fleet' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                        <CardDescription>Review and manage technical records for this fleet.</CardDescription>
                    </div>
                    {canEdit && (
                        <AircraftForm 
                            tenantId={tenantId!} 
                            organizationId={contextOrgId} 
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <AircraftTable 
                    data={filteredAircraft} 
                    tenantId={tenantId!} 
                    canEdit={canEdit}
                />
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  // Scoped landing for external users
  if (!canViewAll && userOrgId) {
    return renderOrgContext(userOrgId);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
            <p className="text-muted-foreground">Manage aircraft assets and technical utilization across all organizations.</p>
        </div>

        <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
            <div className="px-1 shrink-0">
                <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
                    <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Internal</TabsTrigger>
                    {(organizations || []).map(org => (
                        <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
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
    </div>
  );
}
