
'use client';

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Pencil, PlayCircle, Trash2 } from 'lucide-react';
import { NewChecklistDialog } from './new-checklist-dialog';
import { StartAuditDialog } from './start-audit-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

interface ChecklistTemplateCardProps {
    departmentName: string;
    templates: QualityAuditChecklistTemplate[];
    tenantId: string;
    departments: Department[];
    personnel: Personnel[];
}

export function ChecklistTemplateCard({ departmentName, templates, tenantId, departments, personnel }: ChecklistTemplateCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = (templateId: string, templateTitle: string) => {
        if (!firestore) return;
        const templateRef = doc(firestore, `tenants/${tenantId}/quality-audit-templates`, templateId);
        deleteDocumentNonBlocking(templateRef);
        toast({ title: "Template Deleted", description: `"${templateTitle}" has been removed.`});
    }

  return (
    <AccordionItem value={departmentName}>
      <AccordionTrigger className="text-xl font-semibold">{departmentName}</AccordionTrigger>
      <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{template.title}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {template.sections.reduce((acc, section) => acc + section.items.length, 0)} items • {template.sections.length} sections
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StartAuditDialog
                  template={template}
                  tenantId={tenantId}
                  personnel={personnel}
                  departments={departments}
                  trigger={
                    <Button size="sm" className="h-8 text-xs gap-1.5 flex-1">
                      <PlayCircle className="h-3.5 w-3.5" /> Start
                    </Button>
                  }
                />
                <NewChecklistDialog
                  existingTemplate={template}
                  tenantId={tenantId}
                  departments={departments}
                  trigger={
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  }
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8 shrink-0" 
                  onClick={() => handleDelete(template.id, template.title)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
