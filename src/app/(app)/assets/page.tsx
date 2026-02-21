
'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from './page';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';

export type { Aircraft, AircraftComponent } from '@/types/aircraft';


export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const canCreate = hasPermission('assets-create');
  const canEdit = hasPermission('assets-edit');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const handleAddClick = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleRowClick = (aircraft: Aircraft) => {
      if (canEdit) {
        handleEditClick(aircraft);
      }
  }

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  return (
    <div className="flex flex-col gap-6 h-full">
      <AircraftForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        tenantId={tenantId}
        existingAircraft={editingAircraft}
        canCreate={canCreate}
        canEdit={canEdit}
      />
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Fleet</h1>
                <p className="text-muted-foreground">A list of all aircraft registered in the system.</p>
            </div>
        </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8 text-muted-foreground">Loading aircraft...</div>
          )}
          {!isLoading && error && (
            <div className="text-center p-8 text-destructive">Error: {error.message}</div>
          )}
          {!isLoading && !error && (
            <AircraftTable
              aircrafts={aircrafts || []}
              inspectionSettings={inspectionSettings || undefined}
              tenantId={tenantId}
              onEdit={handleEditClick}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
