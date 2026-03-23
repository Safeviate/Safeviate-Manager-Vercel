
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';

export type Department = {
  id: string;
  name: string;
};

export default function DepartmentPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate'; // Hardcoded for now
  const canManage = hasPermission('admin-departments-manage');

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
    <div className="flex flex-col gap-6 h-full min-h-0">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6">
          <div className="space-y-1">
            <CardTitle>Departments</CardTitle>
            <CardDescription>
              A list of all departments within your organization.
            </CardDescription>
          </div>
          {canManage && (
            <div className="flex flex-col gap-1.5 sm:items-end w-full sm:w-auto">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Department Control</p>
              <DepartmentForm tenantId={tenantId} />
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
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
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
