'use client';

import { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  const handleAddNew = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  }

  const canManage = hasPermission('assets-create') || hasPermission('assets-edit');

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
          {canManage && (
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Fleet</CardTitle>
            <CardDescription>A list of all aircraft registered in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {error && <p className="text-destructive text-center p-4">Error loading aircraft: {error.message}</p>}
            {!isLoading && !error && (
              <AircraftTable 
                aircrafts={aircrafts} 
                tenantId={tenantId}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      <AircraftForm 
        isOpen={isFormOpen}
        onClose={handleFormClose}
        tenantId={tenantId}
        existingAircraft={editingAircraft}
      />
    </>
  );
}
