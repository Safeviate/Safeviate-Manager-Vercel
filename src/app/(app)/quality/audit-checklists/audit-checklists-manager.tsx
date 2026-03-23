'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { NewChecklistDialog } from './new-checklist-dialog';
import { ChecklistTemplateCard } from './checklist-template-card';
import { Accordion } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

export default function AuditChecklistsManager() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audit-templates`)) : null),
    [firestore, tenantId]
  );
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/departments`)) : null),
    [firestore, tenantId]
  );
  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );

  const { data: templates, isLoading: isLoadingTemplates } = useCollection<QualityAuditChecklistTemplate>(templatesQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  const isLoading = isLoadingTemplates || isLoadingDepts || isLoadingPersonnel;

  const groupedTemplates = useMemo(() => {
    if (!templates || !departments) return {};
    return templates.reduce((acc, template) => {
      const dept = departments.find(d => d.id === template.departmentId);
      const deptName = dept ? dept.name : 'Uncategorized';
      if (!acc[deptName]) {
        acc[deptName] = [];
      }
      acc[deptName].push(template);
      return acc;
    }, {} as Record<string, QualityAuditChecklistTemplate[]>);
  }, [templates, departments]);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-4 px-1">
        <Skeleton className="h-10 w-48 self-end" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 p-4">
          <div className="flex flex-col gap-1 sm:items-end w-full sm:w-auto">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Template Control</p>
            <NewChecklistDialog
                tenantId={tenantId}
                departments={departments || []}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
              {Object.keys(groupedTemplates).length > 0 ? (
                  <Accordion type="multiple" defaultValue={Object.keys(groupedTemplates)} className="w-full space-y-4">
                  {Object.entries(groupedTemplates).map(([deptName, templates]) => (
                      <ChecklistTemplateCard 
                          key={deptName}
                          departmentName={deptName}
                          templates={templates}
                          tenantId={tenantId}
                          departments={departments || []}
                          personnel={personnel || []}
                      />
                  ))}
                  </Accordion>
              ) : (
                  <div className="border-2 border-dashed rounded-xl p-12 text-center bg-background">
                      <p className="text-muted-foreground font-medium">No checklist templates found. Create one to get started.</p>
                  </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
