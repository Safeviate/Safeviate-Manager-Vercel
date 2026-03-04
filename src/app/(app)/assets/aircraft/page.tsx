'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track all aircraft in the academy fleet.</p>
        </div>
        <AircraftForm tenantId={tenantId} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Hobbs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fleet || []).map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell>{ac.type}</TableCell>
                    <TableCell className="text-right font-mono">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!fleet || fleet.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No aircraft in the fleet yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
