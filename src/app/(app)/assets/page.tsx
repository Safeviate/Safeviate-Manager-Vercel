'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '../admin/document-dates/page';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading: isLoadingAircrafts, error } = useCollection<Aircraft>(aircraftQuery);

  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );
  const { data: inspectionSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const handleAdd = () => {
    setSelectedAircraft(null);
    setIsFormOpen(true);
  };

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
      setIsFormOpen(false);
      setSelectedAircraft(null);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">
            Manage all aircraft in your organization.
          </p>
        </div>
        {canCreate && (
            <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
            </Button>
        )}
      </div>

      <AircraftTable
        aircrafts={aircrafts || []}
        inspectionSettings={inspectionSettings || undefined}
        tenantId={tenantId}
        onEdit={handleEdit}
        onRowClick={handleEdit}
      />
      
      <AircraftForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onClose={handleFormClose}
        tenantId={tenantId}
        existingAircraft={selectedAircraft}
      />
    </div>
  );
}
