'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { PilotProfile } from '../personnel/page';
import { StudentsTable } from './students-table';
import { PersonnelForm } from '../personnel/personnel-form';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { usePermissions } from '@/hooks/use-permissions';
import { MainPageHeader } from '@/components/page-header';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function StudentsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');

  const studentsQuery = useMemoFirebase(
    () =>
      firestore
        && tenantId
        ? query(collection(firestore, 'tenants', tenantId, 'students'))
        : null,
    [firestore, tenantId]
  );
  
  const rolesQuery = useMemoFirebase(
    () =>
      firestore
        && tenantId
        ? query(collection(firestore, 'tenants', tenantId, 'roles'))
        : null,
    [firestore, tenantId]
  );

  const departmentsQuery = useMemoFirebase(
    () =>
      firestore
        && tenantId
        ? query(collection(firestore, 'tenants', tenantId, 'departments'))
        : null,
    [firestore, tenantId]
  );
  

  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useCollection<PilotProfile>(studentsQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);


  const isLoading = isLoadingStudents || isLoadingRoles || isLoadingDepts;
  const error = studentsError || rolesError || deptsError;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Students"
          description="Manage all students in your organization."
          actions={
            canCreateUsers && (
              <PersonnelForm 
                tenantId={tenantId || ''} 
                roles={roles || []} 
                departments={departments || []} 
              />
            )
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            {isLoading && (
                <div className="text-center p-8 text-muted-foreground">Loading students...</div>
            )}
            {!isLoading && error && (
                <div className="text-center p-8 text-destructive font-semibold">Error: {error.message}</div>
            )}
            {!isLoading && !error && students && (
                <StudentsTable data={students} tenantId={tenantId || ''} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
