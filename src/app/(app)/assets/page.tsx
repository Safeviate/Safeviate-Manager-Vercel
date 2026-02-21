
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft, MaintenanceLog } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';


export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div >
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage all aircraft in your organization.
          </p>
        </div>
        {canCreate && <AircraftForm tenantId={tenantId} />}
      </div>

      <Card>
        <CardContent className="p-0">
           {isLoading && (
            <div className="p-8">
              <Skeleton className="h-40 w-full" />
            </div>
           )}
           {!isLoading && error && (
            <div className="p-8 text-center text-destructive">
              Error loading aircraft: {error.message}
            </div>
           )}
           {!isLoading && !error && (
             <AircraftTable 
                aircrafts={aircrafts} 
                tenantId={tenantId} 
             />
           )}
        </CardContent>
      </Card>
    </div>
  );
}
