'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftActions } from './aircraft-actions';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  const getInspectionStatus = (current?: number, next?: number) => {
    if (!current || !next) return null;
    const remaining = next - current;
    if (remaining <= 0) return { label: 'Overdue', variant: 'destructive' as const };
    if (remaining <= 10) return { label: `${remaining.toFixed(1)} hrs`, variant: 'secondary' as const, className: 'bg-orange-500 text-white' };
    return { label: `${remaining.toFixed(1)} hrs`, variant: 'outline' as const };
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor your academy's flight assets.</p>
        </div>
        {canManage && <AircraftForm tenantId={tenantId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>Current status and maintenance tracking for all aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-destructive">
              <p>Error loading fleet: {error.message}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Tacho</TableHead>
                  <TableHead>50hr Insp.</TableHead>
                  <TableHead>100hr Insp.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft && aircraft.length > 0 ? (
                  aircraft.map((ac) => {
                    const status50 = getInspectionStatus(ac.currentTacho, ac.tachoAtNext50Inspection);
                    const status100 = getInspectionStatus(ac.currentTacho, ac.tachoAtNext100Inspection);

                    return (
                      <TableRow key={ac.id}>
                        <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                        <TableCell>{ac.make} {ac.model}</TableCell>
                        <TableCell>{ac.type || 'N/A'}</TableCell>
                        <TableCell className="font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell>
                          {status50 ? (
                            <Badge variant={status50.variant} className={status50.className}>{status50.label}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not Set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {status100 ? (
                            <Badge variant={status100.variant} className={status100.className}>{status100.label}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not Set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <AircraftActions aircraft={ac} tenantId={tenantId} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
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
