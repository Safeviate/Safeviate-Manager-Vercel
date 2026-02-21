'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('assets-create');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [deletingAircraft, setDeletingAircraft] = useState<Aircraft | null>(null);

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);

  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'inspection-warnings') : null),
    [firestore, tenantId]
  );
  
  const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);
  const isLoading = isLoadingAircrafts || isLoadingSettings;
  const error = aircraftsError;

  const handleEdit = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsDialogOpen(true);
  };
  
  const handleAdd = () => {
    setSelectedAircraft(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAircraft(null); // This is crucial
  };

  const handleDeleteRequest = (aircraft: Aircraft) => {
    setDeletingAircraft(aircraft);
  };

  const handleDeleteConfirm = () => {
    if (!firestore || !deletingAircraft) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, deletingAircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Deleted', description: `${deletingAircraft.tailNumber} is being deleted.` });
    setDeletingAircraft(null);
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          handleCloseDialog();
      } else {
          setIsDialogOpen(true);
      }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        {canCreate && (
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{selectedAircraft ? 'Edit Aircraft' : 'Add Aircraft'}</DialogTitle>
                  <DialogDescription>
                      {selectedAircraft ? `Update details for ${selectedAircraft.tailNumber}.` : 'Enter the details for the new aircraft.'}
                  </DialogDescription>
              </DialogHeader>
              {isDialogOpen && (
                <AircraftForm
                    onClose={handleCloseDialog}
                    existingAircraft={selectedAircraft}
                />
              )}
          </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!deletingAircraft} onOpenChange={(open) => !open && setDeletingAircraft(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the aircraft {deletingAircraft?.tailNumber}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {error && <p className="p-4 text-center text-destructive">{error.message}</p>}
          {!isLoading && !error && (
            <AircraftTable
              data={aircrafts || []}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              inspectionSettings={inspectionSettings || undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
