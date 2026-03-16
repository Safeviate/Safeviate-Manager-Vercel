'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { NewChecklistDialog } from './new-checklist-dialog';
import { ChecklistTemplateCard } from './checklist-template-card';
import { Accordion } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex justify-end px-1">
        <NewChecklistDialog
          tenantId={tenantId}
          departments={departments || []}
        />
      </div>
      <div className="px-1">
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
            <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No checklist templates found. Create one to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
}
