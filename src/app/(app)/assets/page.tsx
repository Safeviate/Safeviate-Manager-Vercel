
'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate'; // Hardcoded for now
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

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

  const handleEditClick = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const onOpenChange = (open: boolean) => {
      if (!open) {
          setEditingAircraft(null);
      }
      setIsFormOpen(open);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingAircraft(null);
            setIsFormOpen(true);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8">Loading aircraft...</div>
          )}
          {!isLoading && error && (
            <div className="text-center p-4 text-destructive">Error: {error.message}</div>
          )}
          {!isLoading && !error && (
            <AircraftTable 
              aircrafts={aircrafts || []} 
              inspectionSettings={inspectionSettings}
              onEditClick={handleEditClick}
            />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl">
            {isFormOpen && (
              <>
                <DialogHeader>
                  <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                  <DialogDescription>
                    {editingAircraft ? `Update details for ${editingAircraft.tailNumber}.` : 'Fill in the details for the new aircraft.'}
                  </DialogDescription>
                </DialogHeader>
                <AircraftForm 
                  tenantId={tenantId} 
                  existingAircraft={editingAircraft}
                  onClose={() => onOpenChange(false)}
                />
              </>
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
