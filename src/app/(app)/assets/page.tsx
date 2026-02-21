
'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from './page';
import { AircraftTable } from './aircraft-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditAircraftForm } from './edit-asset-form';
import { usePermissions } from '@/hooks/use-permissions';


export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate'; // Hardcoded for now
  const canCreateAssets = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);

  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
  );
  
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        {canCreateAssets && (
            <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
            </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center">Loading aircraft...</div>}
          {!isLoading && error && <div className="p-8 text-destructive">{error.message}</div>}
          {!isLoading && !error && aircraft && (
            <AircraftTable data={aircraft} tenantId={tenantId} />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Aircraft</DialogTitle>
                <DialogDescription>
                    Fill in the details for the new aircraft.
                </DialogDescription>
              </DialogHeader>
              <EditAircraftForm 
                onFinished={() => setIsFormOpen(false)} 
                tenantId={tenantId}
              />
          </DialogContent>
      </Dialog>

    </div>
  );
}
