'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft, AircraftInspectionWarningSettings } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const canCreate = hasPermission('assets-create');
  const canEdit = hasPermission('assets-edit');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber')) : null),
    [firestore, tenantId]
  );
  
  const rolesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'roles'))
        : null,
    [firestore]
  );

  const departmentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'departments'))
        : null,
    [firestore]
  );
  
  const inspectionSettingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/settings`), where('id', '==', 'inspection-warnings')) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  const { data: inspectionSettingsData } = useCollection<AircraftInspectionWarningSettings>(inspectionSettingsQuery);

  const inspectionSettings = inspectionSettingsData?.[0];
  const isLoading = isLoadingAircrafts || isLoadingRoles || isLoadingDepts;

  const handleOpenForm = (aircraft: Aircraft | null) => {
    if ((aircraft && !canEdit) || (!aircraft && !canCreate)) return;
    setEditingAircraft(aircraft);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    // Setting editingAircraft to null is handled by the onOpenChange of the dialog
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setEditingAircraft(null);
    }
    setIsFormOpen(open);
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
          </div>
          {canCreate && (
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Aircraft
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Fleet</CardTitle>
            <CardDescription>A list of all aircraft in your organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <AircraftTable
                aircrafts={aircrafts || []}
                inspectionSettings={inspectionSettings}
                tenantId={tenantId}
                onEdit={handleOpenForm}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
            <DialogDescription>
              {editingAircraft ? `Editing details for ${editingAircraft.tailNumber}.` : 'Fill in the details for the new aircraft.'}
            </DialogDescription>
          </DialogHeader>
          {isFormOpen && (
            <AircraftForm
                key={editingAircraft?.id || 'new'}
                aircraftData={editingAircraft}
                tenantId={tenantId}
                onClose={handleCloseForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
