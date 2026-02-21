
'use client';

import { useState, useMemo } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/page-header';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';


export default function AssetsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const { hasPermission } = usePermissions();
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const canCreateAssets = hasPermission('assets-create');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);
  
  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  const handleEdit = (aircraft: Aircraft | null) => {
    setEditingAircraft(aircraft);
    setIsDialogOpen(true);
  };
  
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <PageHeader title="Assets" description="Manage your fleet of aircraft." />
        {canCreateAssets && (
          <Button onClick={() => handleEdit(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="text-center p-8">Loading aircraft...</div>}
          {!isLoading && error && <div className="text-center p-8 text-destructive">Error: {error.message}</div>}
          {!isLoading && !error && (
            <AircraftTable
              aircrafts={aircrafts || []}
              inspectionSettings={inspectionSettings || undefined}
              tenantId={tenantId}
              onEdit={handleEdit}
              onRowClick={() => {}} // Placeholder
            />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
          </DialogHeader>
          <AircraftForm
            tenantId={tenantId}
            existingAircraft={editingAircraft}
            onClose={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
