
'use client';

import { useState } from 'react';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MoreVertical, Pencil, PlayCircle, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        toast({ title: "Template Deleted", description: `"${templateTitle}" is being deleted.`});
    }

  return (
    <>
      <AccordionItem value={departmentName}>
        <AccordionTrigger className="text-xl font-semibold">{departmentName}</AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        {template.title}
                    </CardTitle>
                    <CardDescription>{template.sections.reduce((acc, section) => acc + section.items.length, 0)} items in {template.sections.length} sections</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <StartAuditDialog
                          template={template}
                          tenantId={tenantId}
                          personnel={personnel}
                          departments={departments}
                        />
                      </DropdownMenuItem>
                        
                        <NewChecklistDialog
                          existingTemplate={template}
                          tenantId={tenantId}
                          departments={departments}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          }
                        />

                        <DropdownMenuItem onSelect={() => handleDelete(template.id, template.title)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
