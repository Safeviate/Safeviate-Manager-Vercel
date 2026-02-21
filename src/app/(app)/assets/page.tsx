'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const canManageAssets = hasPermission('assets-create') || hasPermission('assets-edit');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error } = useCollection<Aircraft>(aircraftQuery);

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setSelectedAircraft(null);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAircraft(null);
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Aircraft Assets</h1>
                <p className="text-muted-foreground">
                  Manage all aircraft in your organization.
                </p>
            </div>
            {canManageAssets && (
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
              </Button>
            )}
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoadingAircrafts && (
              <div className="p-6 space-y-4">
                <Skeleton className="h-40 w-full" />
              </div>
            )}
            {error && <p className="p-6 text-destructive">Error: {error.message}</p>}
            {!isLoadingAircrafts && (
              <AircraftTable 
                aircrafts={aircrafts || []} 
                tenantId={tenantId}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      <AircraftForm 
        key={selectedAircraft?.id || 'new'}
        tenantId={tenantId} 
        existingAircraft={selectedAircraft} 
        onFormSubmit={handleCloseForm} 
        isOpen={isFormOpen} 
        setIsOpen={setIsFormOpen}
      />
    </>
  );
}
