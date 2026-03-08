
'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

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
          <p className="text-muted-foreground">Manage and monitor your organization's air assets.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>A list of all aircraft registered to your tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">Error loading fleet: {error.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Hobbs</TableHead>
                  <TableHead>Current Tacho</TableHead>
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
                      <TableCell>{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell>{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
