
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import { Skeleton } from '@/components/ui/skeleton';

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  abbreviation: string;
  type: 'Single-Engine' | 'Multi-Engine';
  frameHours: number;
  engineHours: number;
  initialHobbs: number;
  currentHobbs: number;
  initialTacho: number;
  currentTacho: number;
  tachoAtNext50Inspection: number;
  tachoAtNext100Inspection: number;
  emptyWeight: number;
  emptyWeightMoment: number;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
  stationArms: {
    frontSeats: number;
    rearSeats: number;
    fuel: number;
    baggage1: number;
    baggage2: number;
  };
  cgEnvelope: { x: number; y: number }[];
};

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
  );
  
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
                <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
            </div>
            <AircraftForm tenantId={tenantId} />
        </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Loading aircraft...</p>
              </div>
            )}
            {!isLoading && error && (
              <div className="text-center p-8 text-destructive">
                Error: {error.message}
              </div>
            )}
            {!isLoading && !error && aircraft && (
              <AircraftTable aircraft={aircraft} tenantId={tenantId} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
