
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';

export type AircraftDocument = {
  name: string;
  url: string;
  uploadDate: string;
  expirationDate?: string | null;
  abbreviation?: string;
};

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  abbreviation?: string;
  type?: string;
  frameHours?: number;
  engineHours?: number;
  initialHobbs?: number;
  currentHobbs?: number;
  initialTacho?: number;
  currentTacho?: number;
  tachoAtNext50Inspection?: number;
  tachoAtNext100Inspection?: number;
  documents?: AircraftDocument[];
  emptyWeight?: number;
  emptyWeightMoment?: number;
  maxTakeoffWeight?: number;
  maxLandingWeight?: number;
  stationArms?: {
    frontSeats?: number;
    rearSeats?: number;
    fuel?: number;
    baggage1?: number;
    baggage2?: number;
  };
  cgEnvelope?: {
    weight: number;
    cg: number;
  }[];
};

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore, tenantId]
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
                <h1 className="text-3xl font-bold tracking-tight">Aircraft Assets</h1>
                <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
            </div>
            <AircraftForm tenantId={tenantId} />
        </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8">Loading aircraft...</div>
          )}
          {error && (
            <div className="text-center p-8 text-destructive">
              Error: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <AircraftTable tenantId={tenantId} aircraft={aircraft || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
    
