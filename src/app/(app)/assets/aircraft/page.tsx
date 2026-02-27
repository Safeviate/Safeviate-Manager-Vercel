'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftForm } from './aircraft-form';
import { AircraftActions } from './aircraft-actions';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor your academy's aircraft assets.</p>
        </div>
        {canCreate && <AircraftForm tenantId={tenantId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Fleet</CardTitle>
          <CardDescription>A list of all aircraft currently in operation.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {error && <p className="text-destructive text-center py-4">Error: {error.message}</p>}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Hobbs</TableHead>
                  <TableHead>Tacho</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft && aircraft.length > 0 ? (
                  aircraft.map((ac) => (
                    <TableRow key={ac.id}>
                      <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                      <TableCell>{ac.make} {ac.model}</TableCell>
                      <TableCell>{ac.type || 'N/A'}</TableCell>
                      <TableCell>{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell>{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">
                        <AircraftActions tenantId={tenantId} aircraft={ac} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      No aircraft found in the fleet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
