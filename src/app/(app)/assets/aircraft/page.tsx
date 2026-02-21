'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';


export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAircraft(null);
    setIsFormOpen(true);
  };

  if (isFormOpen) {
    return <AircraftForm existingAircraft={selectedAircraft} onCancel={() => setIsFormOpen(false)} />;
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading || isLoadingSettings ? (
            <div className="text-center p-4">Loading aircraft...</div>
          ) : error ? (
            <div className="text-center p-4 text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <AircraftTable 
              data={aircrafts || []} 
              onEdit={handleEdit} 
              inspectionSettings={inspectionSettings}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
