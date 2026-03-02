'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track all aircraft assets in the academy.</p>
        </div>
        {canCreate && <AircraftForm tenantId={tenantId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>A list of active and pending aircraft registrations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AircraftTable data={aircrafts || []} isLoading={isLoading} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}
