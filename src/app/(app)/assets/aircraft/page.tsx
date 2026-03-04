
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftForm } from './aircraft-form';

export default function AircraftListPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('assets-manage');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">Manage and track aircraft availability and status.</p>
        </div>
        {canManage && (
          <AircraftForm tenantId={tenantId} trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Button>
          } />
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
          {fleet && fleet.length > 0 ? (
            fleet.map((ac) => (
              <Card key={ac.id} className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                        <CardDescription>{ac.make} {ac.model}</CardDescription>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/assets/aircraft/${ac.id}`}>
                        <Settings2 className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Current Hobbs</p>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-3 w-3 text-muted-foreground" />
                        <p className="font-mono font-semibold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Current Tacho</p>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-3 w-3 text-muted-foreground" />
                        <p className="font-mono font-semibold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full h-48 flex items-center justify-center">
              <p className="text-muted-foreground">No aircraft found in fleet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
