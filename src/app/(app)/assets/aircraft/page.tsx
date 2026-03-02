
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor your organization's aircraft assets.</p>
        </div>
        {canCreate && (
          <AircraftForm tenantId={tenantId} />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-10">Error loading fleet: {error.message}</p>
      ) : aircraft && aircraft.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aircraft.map((ac) => (
            <Card key={ac.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">{ac.tailNumber}</CardTitle>
                  <CardDescription>{ac.make} {ac.model}</CardDescription>
                </div>
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plane className="size-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Hobbs</p>
                    <p className="font-mono font-bold">{(ac.currentHobbs || 0).toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Type</p>
                    <Badge variant="outline">{ac.type}</Badge>
                  </div>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/assets/aircraft/${ac.id}`}>
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center h-64 border-dashed">
          <Plane className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No aircraft found in your fleet.</p>
          {canCreate && (
            <div className="mt-4">
              <AircraftForm tenantId={tenantId} trigger={<Button variant="outline">Add Your First Aircraft</Button>} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
