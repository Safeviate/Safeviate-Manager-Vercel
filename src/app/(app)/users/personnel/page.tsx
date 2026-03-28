'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PersonnelForm } from './personnel-form';
import { Card, CardContent } from '@/components/ui/card';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { PersonnelTable } from './personnel-table';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { ChevronDown, PlusCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';

export type UserAccessOverrides = {
  hiddenMenus?: string[];
  hiddenTabs?: string[];
};

export type PilotProfile = {
  id: string;
  userType: 'Student' | 'Private Pilot' | 'Instructor';
  userNumber?: string; // For billing/Sage identification
  firstName: string;
  lastName: string;
  email: string;
  role: string; // role ID
  organizationId?: string | null; // Associated external company ID
  permissions?: string[]; // Consolidating permissions across all user types
  accessOverrides?: UserAccessOverrides;
  contactNumber?: string;
  dateOfBirth?: string;
  logbookTemplateId?: string;
  isErpIncerfaContact?: boolean; // Designated ERP INCERFA contact
  isErpAlerfaContact?: boolean; // Designated ERP ALERFA contact
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
  pilotLicense?: {
    licenseNumber?: string;
    issueDate?: string;
    expirationDate?: string;
    ratings?: string[];
    endorsements?: string[];
  }
};

export type Personnel = {
  id: string;
  userType: 'Personnel' | 'External';
  userNumber?: string; // For billing/Sage identification
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  organizationId?: string | null; // Associated external company ID
  department?: string; // department ID
  role: string; // role ID
  permissions: string[];
  accessOverrides?: UserAccessOverrides;
  dateOfBirth?: string;
  isErpIncerfaContact?: boolean; // Designated ERP INCERFA contact
  isErpAlerfaContact?: boolean; // Designated ERP ALERFA contact
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
};

export default function PersonnelPage() {
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');

  const personnelQuery = useMemoFirebase(
    () =>
      firestore
        && tenantId
        ? query(collection(firestore, 'tenants', tenantId, 'personnel'))
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
  

  const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useCollection<Personnel>(personnelQuery);
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
  const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);

  const rolesMap = useMemo(() => {
    if (!roles) return new Map<string, string>();
    return new Map(roles.map(role => [role.id, role.name]));
  }, [roles]);

  const departmentsMap = useMemo(() => {
    if (!departments) return new Map<string, string>();
    return new Map(departments.map(dept => [dept.id, dept.name]));
  }, [departments]);

  const isLoading = isLoadingPersonnel || isLoadingRoles || isLoadingDepts;
  const error = personnelError || rolesError || deptsError;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Personnel Directory"
          description="Manage all non-flying staff in your organization."
          actions={
             <PersonnelForm 
                tenantId={tenantId || ''} 
                roles={roles || []} 
                departments={departments || []}
                trigger={
                    <Button
                        disabled={!canCreateUsers}
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
            <PersonnelTable 
              data={personnel || []} 
              rolesMap={rolesMap} 
              departmentsMap={departmentsMap} 
              tenantId={tenantId || ''} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
