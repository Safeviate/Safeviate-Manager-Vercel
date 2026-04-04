'use client';

import { useEffect, useState, useCallback } from 'react';
import { DepartmentForm } from './department-form';
import { DepartmentActions } from './department-actions';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';

export type Department = {
  id: string;
  name: string;
};

export default function DepartmentPage() {
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const canManage = hasPermission('admin-departments-manage');
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDepartments = useCallback(() => {
    setIsLoading(true);
    try {
        const stored = localStorage.getItem('safeviate.departments');
        if (stored) {
            setDepartments(JSON.parse(stored));
        } else {
            setDepartments([]);
        }
        setError(null);
    } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load departments.'));
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    window.addEventListener('safeviate-departments-updated', loadDepartments);
    return () => window.removeEventListener('safeviate-departments-updated', loadDepartments);
  }, [loadDepartments]);

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Departments"
          actions={canManage && <DepartmentForm tenantId={tenantId || ''} />}
        />

        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {isMobile ? (
              <div className="p-0">
                {isLoading ? (
                  <div className="text-center p-8 uppercase font-bold text-[10px] tracking-widest text-muted-foreground italic bg-muted/5">
                    Loading departments...
                  </div>
                ) : error ? (
                  <div className="text-center p-8 text-destructive text-xs font-bold uppercase">
                    Error: {error.message}
                  </div>
                ) : departments && departments.length > 0 ? (
                  departments.map((dept) => (
                    <div key={dept.id} className="border-b px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-bold leading-snug text-foreground">{dept.name}</p>
                        </div>
                        <div className="shrink-0 overflow-hidden">
                          <DepartmentActions tenantId={tenantId || ''} department={dept} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center h-48 p-8 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-muted/5">
                    No departments found.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold tracking-wider px-6">Department Name</TableHead>
                      <TableHead className="w-[140px] text-right text-[10px] uppercase font-bold tracking-wider px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center p-8 uppercase font-bold text-[10px] tracking-widest text-muted-foreground italic bg-muted/5">
                          Loading departments...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && error && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center p-8 text-destructive text-xs font-bold uppercase">
                          Error: {error.message}
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && !error && departments && departments.length > 0 && (
                      departments.map((dept) => (
                        <TableRow key={dept.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="font-bold text-sm text-foreground px-6 py-4">{dept.name}</TableCell>
                          <TableCell className="w-[140px] text-right px-4">
                             <DepartmentActions tenantId={tenantId || ''} department={dept} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {!isLoading && !error && (!departments || departments.length === 0) && (
                       <TableRow>
                          <TableCell colSpan={2} className="text-center h-48 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-muted/5">
                              No departments found.
                          </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
