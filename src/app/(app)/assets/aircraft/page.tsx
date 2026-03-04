
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { useState } from 'react';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track your academy's fleet status and maintenance hours.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aircraft?.map((ac) => (
            <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plane className="size-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{ac.tailNumber}</CardTitle>
                    <CardDescription>{ac.make} {ac.model}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Current Hobbs</p>
                      <p className="text-lg font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Current Tacho</p>
                      <p className="text-lg font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!aircraft || aircraft.length === 0) && (
            <div className="col-span-full h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
              <Plane className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No aircraft found in the fleet.</p>
            </div>
          )}
        </div>
      )}

      <AircraftForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
}
