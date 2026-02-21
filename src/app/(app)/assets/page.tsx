'use client';

import { useState, useMemo } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from './aircraft-type';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const canCreate = hasPermission('assets-create');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleDelete = (aircraftId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    try {
      deleteDocumentNonBlocking(docRef);
      toast({
        title: "Aircraft Deleted",
        description: "The aircraft is being removed from the register.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
    }
  };

  const handleOpenNewForm = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  }
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        {canCreate && (
            <Button onClick={handleOpenNewForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aircraft Fleet</CardTitle>
          <CardDescription>A list of all aircraft currently in your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {error && <p className="text-destructive text-center p-4">Error loading data: {error.message}</p>}
          {!isLoading && !error && (
            <AircraftTable 
              aircrafts={aircrafts || []}
              inspectionSettings={inspectionSettings || undefined}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
      
      {isFormOpen && (
          <AircraftForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            aircraft={editingAircraft}
            tenantId={tenantId}
          />
      )}
    </div>
  );
}
