
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import { MassBalanceTemplates } from './mass-balance/mass-balance-templates';
import { Skeleton } from '@/components/ui/skeleton';

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  type: 'Single-Engine' | 'Multi-Engine';
  abbreviation: string;
  frameHours?: number;
  engineHours?: number;
  initialHobbs?: number;
  currentHobbs?: number;
  initialTacho?: number;
  currentTacho?: number;
  tachoAtNext50Inspection?: number;
  tachoAtNext100Inspection?: number;
  emptyWeight: number;
  emptyWeightMoment: number;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
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
  
  const {
    data: aircraft,
    isLoading,
    error,
  } = useCollection<Aircraft>(aircraftQuery);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (error) {
      return <div className="text-destructive p-4">Error loading aircraft: {error.message}</div>;
    }
    
    // Only render the table if aircraft data is available.
    if (aircraft) {
        return <AircraftTable aircraft={aircraft} tenantId={tenantId} />;
    }

    // Fallback while waiting for data (even if isLoading is briefly false)
    return (
        <div className="p-4 text-center text-muted-foreground">
            Loading aircraft data...
        </div>
    );
  };


  return (
    <div className="flex flex-col gap-6 h-full">
      <Tabs defaultValue="aircraft">
        <div className="flex justify-between items-center px-1">
          <TabsList>
            <TabsTrigger value="aircraft">Aircraft</TabsTrigger>
            <TabsTrigger value="mass-balance">Mass & Balance</TabsTrigger>
          </TabsList>
          <AircraftForm tenantId={tenantId} />
        </div>
        <Card>
            <CardContent className="p-0">
                <TabsContent value="aircraft" className='m-0'>
                    {renderContent()}
                </TabsContent>
                <TabsContent value="mass-balance" className='m-0'>
                    <MassBalanceTemplates tenantId={tenantId} />
                </TabsContent>
            </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
