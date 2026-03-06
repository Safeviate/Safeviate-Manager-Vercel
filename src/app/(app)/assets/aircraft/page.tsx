'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AircraftForm } from './aircraft-form';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track your academy's assets.</p>
        </div>
        <AircraftForm 
          tenantId={tenantId}
          isOpen={isAddDialogOpen}
          setIsOpen={setIsAddDialogOpen}
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Button>
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8"><Skeleton className="h-48 w-full" /></div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">Error: {error.message}</div>
          ) : fleet && fleet.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Hobbs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ac.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Plane className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No aircraft in your fleet yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
