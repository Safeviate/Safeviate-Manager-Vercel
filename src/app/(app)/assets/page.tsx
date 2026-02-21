
'use client';

import { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  const handleCreateClick = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
            <p className="text-muted-foreground">
              Manage all aircraft in your organization.
            </p>
          </div>
          <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Aircraft
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading && (
              <div className="text-center p-8">Loading aircraft...</div>
            )}
            {!isLoading && error && (
              <div className="text-center p-8 text-destructive">
                Error: {error.message}
              </div>
            )}
            {!isLoading && !error && (
              <AircraftTable
                data={aircrafts || []}
                onEdit={handleEditClick}
                tenantId={tenantId}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <AircraftForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        existingAircraft={editingAircraft}
        tenantId={tenantId}
      />
    </>
  );
}
