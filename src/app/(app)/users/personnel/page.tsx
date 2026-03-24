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
import { PlusCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';

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
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate'; // Hardcoded for now
  const canCreateUsers = hasPermission('users-create');

  const personnelQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'personnel'))
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
            <div className="flex flex-col gap-1.5 sm:items-end w-full sm:w-auto">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest hidden sm:block">Account Controls</p>
              <div className="flex gap-2 w-full sm:w-auto">
                  <PersonnelForm 
                      tenantId={tenantId} 
                      roles={roles || []} 
                      departments={departments || []}
                      trigger={
                          <Button disabled={!canCreateUsers} className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2 h-9 px-6 text-xs font-black uppercase">
                              <PlusCircle className="h-4 w-4" />
                              Add User
                          </Button>
                      }
                  />
              </div>
          </div>
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
              tenantId={tenantId} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
