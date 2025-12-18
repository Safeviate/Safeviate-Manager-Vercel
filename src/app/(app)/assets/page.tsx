'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  type: 'Single-Engine' | 'Multi-Engine';
  checklistStatus: 'Ready' | 'needs-pre-flight' | 'needs-post-flight';
  currentBookingId?: string | null;
  // Add other fields from your Firestore document as needed
};

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // This would typically come from auth or context

  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
  );

  const {
    data: aircraft,
    isLoading,
    error,
  } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
            <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
        </div>
        <AircraftForm tenantId={tenantId} />
      </div>

      <Card>
        <CardContent className='p-0'>
          {isLoading && (
            <div className="p-8 text-center text-muted-foreground">Loading aircraft...</div>
          )}
          {error && (
            <div className="p-8 text-center text-destructive">
              Error: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <AircraftTable data={aircraft || []} tenantId={tenantId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
