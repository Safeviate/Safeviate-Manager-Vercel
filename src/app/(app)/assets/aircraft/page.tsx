'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';

export default function AircraftPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
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
          {isLoading && <Skeleton className="h-40 w-full" />}
          {error && <p className="text-destructive">Error loading aircraft: {error.message}</p>}
          {!isLoading && !error && (
            <div className="text-center p-8 text-muted-foreground">Aircraft table will be displayed here.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
