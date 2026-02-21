'use client';

import { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  const handleOpenDialog = (aircraft: Aircraft | null) => {
    setEditingAircraft(aircraft);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAircraft(null);
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet</h1>
            <p className="text-muted-foreground">A list of all aircraft in your organization.</p>
          </div>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Aircraft
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {error && (
              <div className="p-4 text-center text-destructive">
                Error loading aircraft: {error.message}
              </div>
            )}
            {!isLoading && !error && (
              <AircraftTable 
                data={aircrafts || []} 
                onEdit={handleOpenDialog} 
                tenantId={tenantId}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <AircraftForm
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        aircraft={editingAircraft}
        tenantId={tenantId}
      />
    </>
  );
}
