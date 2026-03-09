
'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftRegistryPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);
  const canCreate = hasPermission('assets-create');

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-muted-foreground">Manage and monitor technical status for all aircraft.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/admin/database">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(fleet || []).map((ac) => (
          <Card key={ac.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                  <CardDescription>{ac.make} {ac.model}</CardDescription>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-muted-foreground">Current Tacho</p>
                  <p className="font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{ac.type || 'N/A'}</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href={`/assets/aircraft/${ac.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {(!fleet || fleet.length === 0) && (
          <div className="col-span-full border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
            No aircraft registered in the fleet.
          </div>
        )}
      </div>
    </div>
  );
}
