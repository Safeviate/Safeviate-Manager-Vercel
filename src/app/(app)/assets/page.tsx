'use client';

import { useState, useMemo, useCallback } from 'react';
import { collection, doc, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getInspectionBadgeStyle } from './utils';
import { usePermissions } from '@/hooks/use-permissions';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setEditingAircraft(null);
    }
    setIsFormOpen(open);
  }

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  }

  const getFiftyHourStyle = (aircraft: Aircraft) => {
    if (!aircraft.currentTacho || !aircraft.tachoAtNext50Inspection || !inspectionSettings) return null;
    return getInspectionBadgeStyle(aircraft.currentTacho, aircraft.tachoAtNext50Inspection, inspectionSettings.fiftyHourWarnings);
  };

  const getHundredHourStyle = (aircraft: Aircraft) => {
    if (!aircraft.currentTacho || !aircraft.tachoAtNext100Inspection || !inspectionSettings) return null;
    return getInspectionBadgeStyle(aircraft.currentTacho, aircraft.tachoAtNext100Inspection, inspectionSettings.oneHundredHourWarnings);
  };


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
            {isLoading && <Skeleton className="h-48" />}
            {error && <div className="text-center p-4 text-destructive">Error: {error.message}</div>}
            {!isLoading && !error && (
              <AircraftTable
                data={aircrafts || []}
                onEdit={handleEdit}
                getFiftyHourStyle={getFiftyHourStyle}
                getHundredHourStyle={getHundredHourStyle}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
            {isFormOpen && (
                <>
                    <DialogHeader>
                        <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                        <DialogDescription>
                            {editingAircraft ? `Editing details for ${editingAircraft.tailNumber}.` : 'Fill in the details for the new aircraft.'}
                        </DialogDescription>
                    </DialogHeader>
                    <AircraftForm
                        existingAircraft={editingAircraft}
                        onClose={() => onOpenChange(false)}
                    />
                </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
