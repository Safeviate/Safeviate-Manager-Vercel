'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);
  
  const handleOpenForm = (aircraft: Aircraft | null = null) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
            <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
          </div>
          {canCreate && (
            <Button onClick={() => handleOpenForm()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aircraft List</CardTitle>
            <CardDescription>A list of all aircraft in the fleet.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
                <div className="space-y-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                </div>
            )}
            {error && <p className="text-destructive">Error: {error.message}</p>}
            {!isLoading && !error && (
              <AircraftTable data={aircraft || []} tenantId={tenantId} onEdit={handleOpenForm} />
            )}
          </CardContent>
        </Card>
      </div>

      <AircraftForm
        tenantId={tenantId}
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        existingAircraft={editingAircraft}
        onFormSubmit={handleFormSubmit}
      />
    </>
  );
}
