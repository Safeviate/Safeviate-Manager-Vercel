'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { PilotProfile, Personnel } from '../personnel/page';
import { ExternalUsersTable } from './external-users-table';
import { PersonnelForm } from '../personnel/personnel-form';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import type { ExternalOrganization } from '@/types/quality';
import { usePermissions } from '@/hooks/use-permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ChevronDown, PlusCircle } from 'lucide-react';

export default function ExternalUsersPage() {
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId, isLoading: isProfileLoading } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');

  // Fetch all user collections to aggregate external users
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);
  
  const rolesQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/roles`)) : null), [firestore, tenantId]);
  const departmentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/departments`)) : null), [firestore, tenantId]);
  const orgsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null), [firestore, tenantId]);

  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots, isLoading: isLoadingPrivates } = useCollection<PilotProfile>(privatePilotsQuery);
  
  const { data: roles } = useCollection<Role>(rolesQuery);
  const { data: departments } = useCollection<Department>(departmentsQuery);
  const { data: organizations } = useCollection<ExternalOrganization>(orgsQuery);

  const isLoading = isProfileLoading || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivates;

  const externalUsers = useMemo(() => {
    const allUsers = [
      ...(personnel || []),
      ...(instructors || []),
      ...(students || []),
      ...(privatePilots || []),
    ];
    return allUsers.filter(u => u.organizationId && u.organizationId !== 'internal');
  }, [personnel, instructors, students, privatePilots]);

  const orgMap = useMemo(() => {
    if (!organizations) return new Map();
    return new Map(organizations.map(o => [o.id, o.name]));
  }, [organizations]);

  const rolesMap = useMemo(() => {
    if (!roles) return new Map();
    return new Map(roles.map(r => [r.id, r.name]));
  }, [roles]);

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="External Users"
          description="Manage all external partners and clients."
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
          ) : (
            <ExternalUsersTable 
              data={externalUsers} 
              orgMap={orgMap} 
              rolesMap={rolesMap}
              tenantId={tenantId || ''} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
