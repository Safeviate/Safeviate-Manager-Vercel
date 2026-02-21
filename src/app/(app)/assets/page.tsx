'use client';

import { useState, useCallback } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from './page';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import type { AircraftInspectionWarningSettings } from '../admin/document-dates/page';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

export type { Aircraft, AircraftComponent } from '@/types/aircraft';


export default function AssetsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const handleOpenForm = useCallback((aircraft: Aircraft | null) => {
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  }, []);

  const handleFormOpenChange = useCallback((open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingAircraft(null);
    }
  }, []);
  
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null), [firestore, tenantId]);

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);
  const { data: inspectionSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  return (
    <div className="flex flex-col gap-6 h-full">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
                <p className="text-muted-foreground">Manage your fleet of aircraft.</p>
            </div>
            {canCreate && (
                <Button onClick={() => handleOpenForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
                </Button>
            )}
        </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8">Loading aircraft...</div>
          )}
          {!isLoading && error && (
            <div className="text-center p-8 text-destructive">Error: {error.message}</div>
          )}
          {!isLoading && !error && (
            <AircraftTable 
                aircrafts={aircraft || []} 
                inspectionSettings={inspectionSettings || undefined}
                tenantId={tenantId}
                onEdit={handleOpenForm}
                onRowClick={() => {}}
            />
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                <DialogDescription>
                    {editingAircraft ? `Editing ${editingAircraft.tailNumber}.` : 'Enter the details for the new aircraft.'}
                </DialogDescription>
            </DialogHeader>
             <AircraftForm 
                tenantId={tenantId} 
                existingAircraft={editingAircraft}
                onClose={() => handleFormOpenChange(false)}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
