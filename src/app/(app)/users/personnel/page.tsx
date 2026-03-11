
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PersonnelForm } from './personnel-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { PersonnelTable } from './personnel-table';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export type PilotProfile = {
  id: string;
  userType: 'Student' | 'Private Pilot' | 'Instructor';
  firstName: string;
  lastName: string;
  email: string;
  role: string; // role ID
  organizationId?: string | null; // NEW: Associate with external company
  permissions?: string[]; // Consolidating permissions across all user types
  contactNumber?: string;
  dateOfBirth?: string;
  logbookTemplateId?: string;
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
  userType: 'Personnel';
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  organizationId?: string | null; // NEW: Associate with external company
  department?: string; // department ID
  role: string; // role ID
  permissions: string[];
  dateOfBirth?: string;
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
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Personnel</h1>
            <p className="text-muted-foreground">Manage all non-flying staff in your organization.</p>
        </div>
        <PersonnelForm 
            tenantId={tenantId} 
            roles={roles || []} 
            departments={departments || []}
            trigger={
                <Button disabled={!canCreateUsers}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="text-center p-8">Loading personnel...</div>
          )}
          {!isLoading && !error && (
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
