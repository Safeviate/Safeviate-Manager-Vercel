'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddOpen, setIsAddOpen] = useState(false);

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
          <p className="text-muted-foreground">Manage and track your academy's assets.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Register New Aircraft</DialogTitle></DialogHeader>
            <AircraftForm tenantId={tenantId} onSuccess={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">Error: {error.message}</div>
          ) : aircraft && aircraft.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Tacho</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell>{ac.type}</TableCell>
                    <TableCell className="text-right font-mono">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/assets/aircraft/${ac.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Plane className="h-12 w-12 mb-4 opacity-20" />
              <p>No aircraft registered in the fleet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
