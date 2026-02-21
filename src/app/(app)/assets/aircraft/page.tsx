
'use client';

import { useMemo } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';
import { AircraftTable } from './aircraft-table';
import { Card, CardContent } from '@/components/ui/card';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate'; // Hardcoded for now
  const canCreateAircrafts = hasPermission('assets-create');

  const aircraftsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
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
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings/inspection-warnings`) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);
  const { data: inspectionSettings, isLoading: isLoadingInspections, error: inspectionsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircrafts || isLoadingRoles || isLoadingDepts || isLoadingInspections;
  const error = aircraftsError || rolesError || deptsError || inspectionsError;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">
            An overview of all aircraft in your organization.
          </p>
        </div>
        {canCreateAircrafts && (
          <AircraftForm
            tenantId={tenantId}
            onSuccess={() => {
              // Optionally re-fetch or update data here, though useCollection handles it
            }}
          />
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-4">Loading aircraft...</div>
          )}
          {!isLoading && error && (
            <div className="text-center p-4 text-destructive">Error: {error.message}</div>
          )}
          {!isLoading && !error && aircrafts && (
            <AircraftTable 
              data={aircrafts} 
              inspectionSettings={inspectionSettings} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
