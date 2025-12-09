
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { PersonnelForm } from '../personnel/personnel-form';
import { PersonnelActions } from '../personnel/personnel-actions';
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
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import type { PilotProfile } from '../personnel/page';

export default function PrivatePilotsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const pilotsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'pilots'), where('userType', '==', 'Private Pilot'))
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
      <div className="flex justify-end">
        <PersonnelForm tenantId={tenantId} roles={roles || []} departments={departments || []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Private Pilots</CardTitle>
          <CardDescription>
            A list of all private pilots within your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>License No.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading private pilots...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && pilots && pilots.length > 0 && (
                pilots.map((pilot) => (
                  <TableRow key={pilot.id}>
                    <TableCell className="font-medium">{pilot.firstName} {pilot.lastName}</TableCell>
                    <TableCell>{pilot.email}</TableCell>
                    <TableCell>{pilot.contactNumber || 'N/A'}</TableCell>
                    <TableCell>{pilot.pilotLicense?.licenseNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <PersonnelActions tenantId={tenantId} user={pilot} />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && (!pilots || pilots.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No private pilots found.
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

    