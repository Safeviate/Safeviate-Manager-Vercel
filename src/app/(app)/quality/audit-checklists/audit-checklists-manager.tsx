'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { NewChecklistDialog } from './new-checklist-dialog';
import { ChecklistTemplateCard } from './checklist-template-card';
import { Accordion } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
<<<<<<< HEAD
import { Card, CardContent } from '@/components/ui/card';
=======
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
>>>>>>> temp-save-work
import { ScrollArea } from '@/components/ui/scroll-area';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';
import { MainPageHeader } from '@/components/page-header';

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
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <div className="sticky top-0 z-30 bg-card">
          <MainPageHeader 
            title="Audit Checklists"
            description="Manage templates for regular quality, safety, and compliance audits."
            actions={
              <NewChecklistDialog
                  tenantId={tenantId}
                  departments={departments || []}
              />
            }
          />
        </div>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full custom-scrollbar pr-4">
            <div className="p-6 pb-20 space-y-6">
=======
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Audit Checklists"
          actions={
            <NewChecklistDialog
                tenantId={tenantId}
                departments={departments || []}
            />
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
>>>>>>> temp-save-work
              {Object.keys(groupedTemplates).length > 0 ? (
                  <Accordion type="multiple" defaultValue={Object.keys(groupedTemplates)} className="w-full space-y-6">
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
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <p className="text-sm font-black uppercase tracking-widest">No checklist templates found.</p>
                    <p className="text-xs font-medium">Create a new template to start conducting audits.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
