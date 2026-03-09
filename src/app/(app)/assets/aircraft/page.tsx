
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function FleetOverviewPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>A list of all active aircraft in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-4">Error loading fleet: {error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Tacho</TableHead>
                  <TableHead className="text-right">Next 50hr</TableHead>
                  <TableHead className="text-right">Next 100hr</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft && aircraft.length > 0 ? (
                  aircraft.map((ac) => (
                    <TableRow key={ac.id}>
                      <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                      <TableCell>{ac.make} {ac.model}</TableCell>
                      <TableCell>{ac.type}</TableCell>
                      <TableCell className="text-right">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">{ac.tachoAtNext50Inspection?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">{ac.tachoAtNext100Inspection?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="default" size="sm" className="gap-2">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
