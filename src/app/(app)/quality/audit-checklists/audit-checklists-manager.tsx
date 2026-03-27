'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { NewChecklistDialog } from './new-checklist-dialog';
import { ChecklistTemplateCard } from './checklist-template-card';
import { Accordion } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MainPageHeader } from "@/components/page-header";
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

export default function AuditChecklistsManager() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const isMobile = useIsMobile();

  const templatesQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/quality-audit-templates`)) : null),
    [firestore, tenantId]
  );
  
  const personnelQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );

  const departmentsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/departments`)) : null),
    [firestore, tenantId]
  );

  const { data: templates, isLoading: isLoadingTemplates } = useCollection<QualityAuditChecklistTemplate>(templatesQuery);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: departments } = useCollection<Department>(departmentsQuery);

  const groupedTemplates = useMemo(() => {
    if (!templates) return {};
    
    return templates.reduce((acc, template) => {
      const category = template.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, QualityAuditChecklistTemplate[]>);
  }, [templates]);


  if (isLoadingTemplates) {
    return (
      <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className={cn("max-w-[1200px] mx-auto w-full flex flex-col gap-4 px-1", isMobile ? "min-h-0 overflow-y-auto" : "h-full overflow-hidden")}>
      <Card className={cn("flex flex-col shadow-none border", isMobile ? "min-h-0 overflow-visible" : "h-full overflow-hidden")}>
        <MainPageHeader 
          title="Audit Checklists"
          actions={
            <NewChecklistDialog
                tenantId={tenantId || ''}
                departments={departments || []}
            />
          }
        />
        
        <CardContent className={cn("flex-1 p-0 bg-muted/5", isMobile ? "overflow-y-auto" : "overflow-hidden")}>
          <ScrollArea className={cn(isMobile ? "h-auto" : "h-full")}>
            <div className="p-4 md:p-6 pb-20">
              {Object.keys(groupedTemplates).length > 0 ? (
                  <Accordion type="multiple" defaultValue={Object.keys(groupedTemplates)} className="w-full space-y-6">
                    {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                        <ChecklistTemplateCard 
                            key={category}
                            category={category}
                            templates={categoryTemplates}
                            tenantId={tenantId || ''}
                            personnel={personnel || []}
                            departments={departments || []}
                        />
                    ))}
                  </Accordion>
              ) : (
                <div className="text-center py-20 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-background rounded-2xl border-2 border-dashed shadow-sm">
                    No checklist templates found.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
