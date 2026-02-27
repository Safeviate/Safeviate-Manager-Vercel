'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, resolvedParams.id) : null),
    [firestore, tenantId, resolvedParams.id]
  );

  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !aircraft) return <div className="text-center py-10">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/assets/aircraft">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Fleet
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl">{aircraft.tailNumber}</CardTitle>
            <CardDescription>{aircraft.make} {aircraft.model}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div><p className="text-sm text-muted-foreground">Type</p><p className="font-semibold text-lg">{aircraft.type || 'N/A'}</p></div>
          <div><p className="text-sm text-muted-foreground">Current Hobbs</p><p className="font-semibold text-lg">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p></div>
          <div><p className="text-sm text-muted-foreground">Current Tacho</p><p className="font-semibold text-lg">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
