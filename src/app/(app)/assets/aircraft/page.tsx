
'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  
  // State to control the visibility of the new aircraft form dialog
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);


  // Fetch inspection warning settings
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );
  const { data: inspectionSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  // Fetch aircraft data
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircraft`)) : null),
    [firestore, tenantId]
  );
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);
  
  const handleEdit = (aircraftToEdit: Aircraft) => {
    setEditingAircraft(aircraftToEdit);
  };

  const handleCancelEdit = () => {
    setEditingAircraft(null);
  };


  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">
            A list of all aircraft in your organization.
          </p>
        </div>
        <Button onClick={() => setIsCreateFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
        </Button>
      </div>

      {/* Dialog for Creating a new aircraft */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="p-0 border-none sm:max-w-4xl">
            <AircraftForm onCancel={() => setIsCreateFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Editing an existing aircraft */}
       <Dialog open={!!editingAircraft} onOpenChange={(open) => !open && setEditingAircraft(null)}>
        <DialogContent className="p-0 border-none sm:max-w-4xl">
            <AircraftForm onCancel={handleCancelEdit} existingAircraft={editingAircraft} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-4">Loading aircraft...</div>
          )}
          {!isLoading && !error && aircraft && (
            <AircraftTable
              data={aircraft}
              tenantId={tenantId}
              onEdit={handleEdit}
              inspectionSettings={inspectionSettings}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
