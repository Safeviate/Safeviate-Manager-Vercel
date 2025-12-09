'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { DepartmentForm } from './department-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      {isLoading && (
         <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <p>Loading departments...</p>
         </div>
      )}

      {!isLoading && !error && departments && departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (!departments || departments.length === 0) && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              You have no departments
            </h3>
            <p className="text-sm text-muted-foreground">
              You can start by adding a new department.
            </p>
          </div>
        </div>
      )}
       {error && (
         <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-destructive shadow-sm">
            <p className='text-destructive'>Error loading departments: {error.message}</p>
         </div>
       )}
    </div>
  );
}
