'use client';

import { useState, useMemo, useCallback } from 'react';
import { collection, doc, query } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/page-header';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getInspectionBadgeStyle } from './utils';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const canCreate = hasPermission('assets-create');

  const handleEdit = (aircraft: Aircraft | null) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleDelete = (aircraftId: string) => {
      // onDelete function logic here
      console.log('Deleting aircraft', aircraftId);
  }

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAircraft(null);
  };

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings/inspection-warnings`) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Aircraft Assets"
          description="Manage all aircraft in your organization."
        />
        {canCreate && (
          <Button onClick={() => handleEdit(null)}>
            <PlusCircle />
            Add Aircraft
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {error && <p className="text-destructive p-6">Error: {error.message}</p>}
          {!isLoading && !error && (
            <AircraftTable 
              aircrafts={aircrafts || []} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              inspectionSettings={inspectionSettings}
            />
          )}
        </CardContent>
      </Card>
      {isFormOpen && (
        <AircraftForm 
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          aircraft={editingAircraft}
        />
      )}
    </div>
  );
}
