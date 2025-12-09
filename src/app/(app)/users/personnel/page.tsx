'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PersonnelForm } from './personnel-form';
import { PersonnelActions } from './personnel-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Role } from '../roles/page';
import type { Department } from '../../admin/department/page';

export type Personnel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  department?: string; // department ID
  role: string; // role ID
  permissions: string[];
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
};

export default function PersonnelPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

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
      <div className="flex justify-end">
        <PersonnelForm tenantId={tenantId} roles={roles || []} departments={departments || []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personnel</CardTitle>
          <CardDescription>
            A list of all personnel within your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Custom Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading personnel...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && personnel && personnel.length > 0 && (
                personnel.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.firstName} {person.lastName}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>{person.contactNumber || 'N/A'}</TableCell>
                    <TableCell>{departmentsMap.get(person.department || '') || 'N/A'}</TableCell>
                    <TableCell>{rolesMap.get(person.role) || person.role}</TableCell>
                    <TableCell>
                      <Badge variant={person.permissions?.length > 0 ? "secondary" : "outline"}>
                        {person.permissions?.length || 0} assigned
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <PersonnelActions tenantId={tenantId} personnel={person} roles={roles || []} departments={departments || []} />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && (!personnel || personnel.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                        No personnel found.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    