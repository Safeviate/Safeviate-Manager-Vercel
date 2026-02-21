'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';

export default function AircraftPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        <AircraftForm
          tenantId={tenantId}
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Aircraft
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aircraft Fleet</CardTitle>
          <CardDescription>A list of all aircraft currently in your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading aircraft...</p>}
          {error && <p className="text-destructive">Error: {error.message}</p>}
          {aircraft && <AircraftTable data={aircraft} tenantId={tenantId} />}
        </CardContent>
      </Card>
    </div>
  );
}
