'use client';

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Pencil, PlayCircle, Trash2, MoreHorizontal, ChevronsUpDown } from 'lucide-react';
import { NewChecklistDialog } from './new-checklist-dialog';
import { StartAuditDialog } from './start-audit-dialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';
import { useIsMobile } from '@/hooks/use-mobile';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface ChecklistTemplateCardProps {
    category: string; // Changed from departmentName for consistency with audit-checklists-manager
    templates: QualityAuditChecklistTemplate[];
    tenantId: string;
    departments: Department[];
    personnel: Personnel[];
}

export function ChecklistTemplateCard({ category, templates, tenantId, departments, personnel }: ChecklistTemplateCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const handleDelete = (templateId: string, templateTitle: string) => {
        if (!firestore) return;
        const templateRef = doc(firestore, `tenants/${tenantId}/quality-audit-templates`, templateId);
        deleteDocumentNonBlocking(templateRef);
        toast({ title: "Template Deleted", description: `"${templateTitle}" has been removed.`});
    }

  return (
    <AccordionItem value={category}>
      <AccordionTrigger className="text-xl font-semibold">{category}</AccordionTrigger> {/* Removed diagnostic onClick and display */}
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
                {isMobile ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-between border-slate-300 bg-white px-3 text-[10px] font-black uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <span className="flex items-center gap-2">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                          Actions
                        </span>
                        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                    >
                      <StartAuditDialog
                        template={template}
                        tenantId={tenantId}
                        personnel={personnel}
                        departments={departments}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                            <PlayCircle className="mr-2 h-3.5 w-3.5" /> Start
                          </DropdownMenuItem>
                        }
                      />
                      <NewChecklistDialog
                        existingTemplate={template}
                        tenantId={tenantId}
                        departments={departments}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Template
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => handleDelete(template.id, template.title)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0 border-slate-300"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <NewChecklistDialog
                          existingTemplate={template}
                          tenantId={tenantId}
                          departments={departments}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Template
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={() => handleDelete(template.id, template.title)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
