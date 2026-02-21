'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { AircraftTable } from './aircraft-table';

export interface Aircraft {
  id: string;
  make: string;
  model: string;
  tailNumber: string;
  frameHours?: number;
  engineHours?: number;
  currentHobbs?: number;
}


export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <CardHeader className="p-0">
          <CardTitle>Aircraft Fleet</CardTitle>
          <CardDescription>Manage all aircraft in your organization.</CardDescription>
        </CardHeader>
        <Button asChild>
          <Link href="/assets/aircraft/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Aircraft
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="text-center p-4">Loading aircraft...</div>}
          {!isLoading && error && <div className="text-center p-4 text-destructive">Error: {error.message}</div>}
          {!isLoading && !error && aircraft && (
            <AircraftTable 
              data={aircraft} 
              tenantId={tenantId} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
