'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plane, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardContent className="p-8"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track technical status across your fleet.</p>
        </div>
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Current Hobbs</TableHead>
                <TableHead className="text-right">Current Tacho</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft && aircraft.length > 0 ? (
                aircraft.map((ac) => {
                  const tacho = ac.currentTacho || 0;
                  const next50 = ac.tachoAtNext50Inspection || 0;
                  const hoursTo50 = next50 - tacho;
                  const isCritical = hoursTo50 < 5;

                  return (
                    <TableRow key={ac.id}>
                      <TableCell className="font-bold font-mono">{ac.tailNumber}</TableCell>
                      <TableCell>{ac.make} {ac.model}</TableCell>
                      <TableCell>{ac.type}</TableCell>
                      <TableCell className="text-right font-mono">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-[10px]">
                          {isCritical ? <AlertCircle className="mr-1 h-3 w-3" /> : null}
                          {isCritical ? 'Inspection Due' : 'Airworthy'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
