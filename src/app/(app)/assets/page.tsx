'use client';

import { useState, useMemo } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';

export type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { Aircraft } from '@/types/aircraft';


export default function AssetsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const handleEdit = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAircraft(null);
    setIsDialogOpen(true);
  };

  const onDialogClose = () => {
      setIsDialogOpen(false);
      setEditingAircraft(null);
  }

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings/inspection-warnings`) : null),
    [firestore, tenantId]
  );
  const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const { data: aircrafts, isLoading: isLoadingAircrafts, error } = useCollection<Aircraft>(aircraftQuery);

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {!isLoading && error && (
            <div className="p-6 text-center text-destructive">
              Error loading aircraft: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <AircraftTable 
              aircrafts={aircrafts || []} 
              inspectionSettings={inspectionSettings}
              tenantId={tenantId}
              onEdit={handleEdit}
              onRowClick={() => {}}
            />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={onDialogClose}>
          <DialogContent className="max-w-4xl">
              {isDialogOpen && (
                <>
                    <DialogHeader>
                        <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                        <DialogDescription>
                            {editingAircraft ? `Update details for ${editingAircraft.tailNumber}.` : 'Enter the details for the new aircraft.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <AircraftForm 
                            existingAircraft={editingAircraft} 
                            tenantId={tenantId} 
                            onClose={onDialogClose}
                        />
                    </div>
                </>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
