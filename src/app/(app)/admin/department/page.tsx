'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { DepartmentForm } from './department-form';
import { DepartmentActions } from './department-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Department = {
  id: string;
  name: string;
};

export default function DepartmentPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const departmentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'departments'))
        : null,
    [firestore]
  );

  const {
    data: departments,
    isLoading,
    error,
  } = useCollection<Department>(departmentsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-end">
        <DepartmentForm tenantId={tenantId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            A list of all departments within your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    Loading departments...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && departments && departments.length > 0 && (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-right">
                       <DepartmentActions tenantId={tenantId} department={dept} />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && (!departments || departments.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">
                        No departments found.
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
