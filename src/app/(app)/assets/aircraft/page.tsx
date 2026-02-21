'use client';

import { AircraftForm } from './aircraft-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const aircraftsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
  );
  
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        <AircraftForm />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Fleet</CardTitle>
            <CardDescription>A list of all aircraft in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Loading aircraft...</p>}
            {error && <p className="text-destructive">Error: {error.message}</p>}
            {aircrafts && <AircraftTable data={aircrafts} />}
        </CardContent>
      </Card>
    </div>
  );
}
