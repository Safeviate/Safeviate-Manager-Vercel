
'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AircraftComponents } from './aircraft-components';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftOverview({ aircraft }: { aircraft: Aircraft }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Details for {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Model: {aircraft.model}</p>
                <p>Type: {aircraft.type}</p>
            </CardContent>
        </Card>
    )
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();

  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

  if (isLoading) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-1/4" />
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error: {error.message}</div>;
  }
  
  if (!aircraft) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardContent>
            <p>The requested aircraft could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.model}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AircraftOverview aircraft={aircraft} />
        </TabsContent>
        <TabsContent value="components">
          <AircraftComponents aircraft={aircraft} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <AircraftDetailPageContent {...props} />
        </Suspense>
    )
}
