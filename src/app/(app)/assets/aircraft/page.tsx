'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plane, ChevronRight } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor your academy's aircraft resources.</p>
        </div>
        <AircraftForm tenantId={tenantId} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleet?.map((aircraft) => (
            <Link key={aircraft.id} href={`/assets/aircraft/${aircraft.id}`}>
              <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">{aircraft.tailNumber}</CardTitle>
                    <CardDescription>{aircraft.make} {aircraft.model}</CardDescription>
                  </div>
                  <Plane className="h-8 w-8 text-muted-foreground opacity-20" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mt-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Current Hobbs</p>
                      <p className="text-lg font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Details <ChevronRight className="h-3 w-3" />
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!fleet || fleet.length === 0) && (
            <Card className="col-span-full h-48 flex items-center justify-center text-muted-foreground border-dashed">
              No aircraft in fleet. Add one to get started.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
