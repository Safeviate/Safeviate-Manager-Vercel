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
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ChevronDown, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentsPage() {
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId, isLoading: isProfileLoading } = useUserProfile();
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


  const isLoading = isProfileLoading || isLoadingStudents || isLoadingRoles || isLoadingDepts;
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
                trigger={
                   <Button
                       disabled={!canCreateUsers || isProfileLoading}
                       variant={isMobile ? 'outline' : 'default'}
                       size={isMobile ? 'sm' : 'default'}
                       className={isMobile ? 'h-9 w-full justify-between border-input bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-accent/40' : 'w-full gap-2 px-6 text-xs font-black uppercase shadow-md sm:w-auto'}
                   >
                       <span className="flex items-center gap-2">
                           <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                           Add User
                       </span>
                       {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                   </Button>
                }
              />
            )
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
           {isLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
            ) : error ? (
                <div className="text-center p-8 text-destructive font-semibold">Error: {error.message}</div>
            ) : students && (
                <StudentsTable data={students} tenantId={tenantId || ''} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
