
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { AircraftForm } from './aircraft-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/use-permissions';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { doc } from 'firebase/firestore';


export default function AircraftPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const [isFormOpen, setIsFormOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
        </div>
        {canCreate && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <AircraftForm 
                onFormSubmit={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
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
                data={aircrafts || []} 
                tenantId={tenantId}
                inspectionSettings={inspectionSettings}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
