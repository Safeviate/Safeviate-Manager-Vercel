
'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftList } from './aircraft-list';
import type { Aircraft } from '@/types/aircraft';
import { Plane } from 'lucide-react';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1350px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            <CardTitle>Fleet Inventory</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <AircraftList data={aircrafts || []} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}
