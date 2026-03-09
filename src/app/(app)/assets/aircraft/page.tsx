
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fleet Overview</h1>
        <p className="text-muted-foreground">Manage and monitor your aircraft fleet.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft?.map((ac) => (
                <TableRow key={ac.id}>
                  <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                  <TableCell>{ac.make} {ac.model}</TableCell>
                  <TableCell>{ac.type}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="default" size="sm">
                      <Link href={`/assets/aircraft/${ac.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!aircraft || aircraft.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No aircraft found in the fleet.
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
