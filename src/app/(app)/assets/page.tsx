'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Aircraft } from './aircraft-table';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import type { AircraftInspectionWarningSettings } from '../admin/document-dates/page';

export default function AssetsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftQuery);
  const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError || settingsError;

  const handleAddClick = () => {
    setEditingAircraft(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (aircraft: Aircraft) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
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
          <p className="text-muted-foreground">Manage your fleet of aircraft.</p>
        </div>
        {canCreate && (
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && error && (
            <div className="p-4 text-center text-destructive">
                Error loading data: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <AircraftTable
                aircrafts={aircrafts || []}
                inspectionSettings={inspectionSettings}
                tenantId={tenantId}
                onEdit={handleEditClick}
            />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add Aircraft'}</DialogTitle>
            <DialogDescription>
              {editingAircraft ? 'Update the details for this aircraft.' : 'Enter the details for the new aircraft.'}
            </DialogDescription>
          </DialogHeader>
          <AircraftForm 
            tenantId={tenantId}
            aircraft={editingAircraft}
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
