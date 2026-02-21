'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import Link from 'next/link';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
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
        <Button asChild>
          <Link href="/assets/aircraft/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Aircraft
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8">Loading aircraft...</div>
          )}
          {!isLoading && error && (
            <div className="text-center p-4 text-destructive">Error: {error.message}</div>
          )}
          {!isLoading && !error && aircrafts && (
            <AircraftTable data={aircrafts} tenantId={tenantId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
