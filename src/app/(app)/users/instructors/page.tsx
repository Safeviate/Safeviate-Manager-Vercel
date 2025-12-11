
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { PilotProfile } from '../personnel/page';
import { InstructorsTable } from './instructors-table';
import { PersonnelForm } from '../personnel/personnel-form';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';

export default function InstructorsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const pilotsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'pilots'), where('userType', '==', 'Instructor'))
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

  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);


  const isLoading = isLoadingPilots || isLoadingRoles || isLoadingDepts;
  const error = pilotsError || rolesError || deptsError;

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
                <p className="text-muted-foreground">Manage all instructors in your organization.</p>
            </div>
            <PersonnelForm tenantId={tenantId} roles={roles || []} departments={departments || []} />
        </div>
      <Card>
        <CardContent className="p-0">
           {isLoading && (
              <div className="text-center p-4">Loading instructors...</div>
            )}
            {!isLoading && error && (
              <div className="text-center p-4 text-destructive">Error: {error.message}</div>
            )}
            {!isLoading && !error && pilots && (
              <InstructorsTable data={pilots} tenantId={tenantId} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
