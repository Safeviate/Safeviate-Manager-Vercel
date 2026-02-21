
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { useCollection, useFirestore, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('assets-create');
  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  const tenantId = 'safeviate';

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
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

  const handleNew = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleDelete = (aircraftId: string) => {
    if (!firestore || !canDelete) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Aircraft Deleted' });
  };
  
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
          <Button onClick={handleNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <Skeleton className="h-48" />}
          {error && <p className="text-destructive p-4">Error loading data: {error.message}</p>}
          {!isLoading && !error && (
            <AircraftTable
              aircrafts={aircrafts || []}
              inspectionSettings={inspectionSettings}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
            />
          )}
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <AircraftForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          existingAircraft={editingAircraft}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}
