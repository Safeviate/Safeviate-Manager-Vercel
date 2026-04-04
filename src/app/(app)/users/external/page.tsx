'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId, isLoading: isProfileLoading } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [instructors, setInstructors] = useState<PilotProfile[]>([]);
  const [students, setStudents] = useState<PilotProfile[]>([]);
  const [privatePilots, setPrivatePilots] = useState<PilotProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    try {
      const storedPersonnel = localStorage.getItem('safeviate.personnel');
      if (storedPersonnel) setPersonnel(JSON.parse(storedPersonnel));

      const storedInstructors = localStorage.getItem('safeviate.instructors');
      if (storedInstructors) setInstructors(JSON.parse(storedInstructors));

      const storedStudents = localStorage.getItem('safeviate.students');
      if (storedStudents) setStudents(JSON.parse(storedStudents));

      const storedPilots = localStorage.getItem('safeviate.private-pilots');
      if (storedPilots) setPrivatePilots(JSON.parse(storedPilots));
      
      const storedRoles = localStorage.getItem('safeviate.roles');
      if (storedRoles) setRoles(JSON.parse(storedRoles));
      
      const storedDepts = localStorage.getItem('safeviate.departments');
      if (storedDepts) setDepartments(JSON.parse(storedDepts));

      const storedOrgs = localStorage.getItem('safeviate.external-organizations');
      if (storedOrgs) setOrganizations(JSON.parse(storedOrgs));
    } catch (err: any) {
      // ignore
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const isLoading = isProfileLoading || isLoadingData;

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
