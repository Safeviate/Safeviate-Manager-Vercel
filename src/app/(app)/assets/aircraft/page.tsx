'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plane, PlusCircle, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { AddAircraftDialog } from './add-aircraft-dialog';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track utilization for all organization assets.</p>
        </div>
        {canManage && <AddAircraftDialog tenantId={tenantId} />}
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tail Number</TableHead>
                <TableHead>Make / Model</TableHead>
                <TableHead className="text-right">Hobbs</TableHead>
                <TableHead className="text-right">Tacho</TableHead>
                <TableHead className="text-center">Maintenance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft && aircraft.length > 0 ? (
                aircraft.map((ac) => {
                  const hoursToNext50 = (ac.tachoAtNext50Inspection || 0) - (ac.currentTacho || 0);
                  const isDue = hoursToNext50 <= 5;
                  const isWarning = hoursToNext50 <= 10;

                  return (
                    <TableRow key={ac.id}>
                      <TableCell className="font-black text-primary">{ac.tailNumber}</TableCell>
                      <TableCell className="text-xs font-medium">{ac.make} {ac.model}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={isDue ? 'destructive' : isWarning ? 'secondary' : 'outline'}
                          className="text-[10px] gap-1 px-2"
                        >
                          <Wrench className="h-3 w-3" />
                          {hoursToNext50.toFixed(1)}h rem.
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 gap-2">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-4 w-4" /> View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    No aircraft found in fleet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}