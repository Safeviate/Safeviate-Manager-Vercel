
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from './page';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';

export type { Aircraft } from '@/types/aircraft';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
      [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircraft || isLoadingSettings;
  const error = aircraftError || settingsError;

  // This effect ensures that the editingAircraft state is cleared AFTER the dialog closes,
  // preventing state conflicts during animations.
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingAircraft(null);
    }
  }, [isDialogOpen]);

  const handleAddNew = () => {
    setEditingAircraft(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (aircraftToEdit: Aircraft) => {
    setEditingAircraft(aircraftToEdit);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
      setIsDialogOpen(false);
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
            <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
          </div>
          {canCreate && (
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
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
            {error && <div className="p-6 text-destructive text-center">Error: {error.message}</div>}
            {!isLoading && !error && (
              <AircraftTable
                data={aircraft || []}
                onEdit={handleEdit}
                inspectionSettings={inspectionSettings}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
            <DialogDescription>
              {editingAircraft ? `Editing details for ${editingAircraft.tailNumber}` : 'Enter the details for the new aircraft.'}
            </DialogDescription>
          </DialogHeader>
          {isDialogOpen && (
             <AircraftForm
                tenantId={tenantId}
                existingAircraft={editingAircraft}
                onClose={closeDialog}
             />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
