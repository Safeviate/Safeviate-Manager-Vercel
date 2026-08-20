'use client';

import { Archive, ChevronsUpDown, FileText, MoreHorizontal, Pencil, PlayCircle } from 'lucide-react';
import { StartAuditDialog } from './start-audit-dialog';
import { useToast } from '@/hooks/use-toast';
import type { QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';
import { cn } from '@/lib/utils';
import { CARD_HEADER_ACTION_ZONE_CLASS } from '@/components/page-header';
import { PAGE_FORMAT_HEADER_COMPACT_DROPDOWN_BUTTON_CLASS } from '@/lib/page-format-buttons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ChecklistTemplateCardProps {
  category: string;
  templates: QualityAuditChecklistTemplate[];
  tenantId: string;
  departments: Department[];
  personnel: Personnel[];
  organizations?: { id: string; name: string }[];
  onEditTemplate: (template: QualityAuditChecklistTemplate) => void;
}

export function ChecklistTemplateCard({
  category,
  templates,
  tenantId,
  departments,
  personnel,
  organizations = [],
  onEditTemplate,
}: ChecklistTemplateCardProps) {
  const { toast } = useToast();

  const handleArchive = async (templateId: string, templateTitle: string) => {
    try {
      const response = await fetch(
        `/api/quality-audit-templates?id=${encodeURIComponent(templateId)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw new Error('Failed to archive template');
      window.dispatchEvent(new Event('safeviate-quality-templates-updated'));
      toast({ title: 'Template Archived', description: `"${templateTitle}" was moved to the Recovery Vault.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border bg-background shadow-none">
      <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground">{category}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {templates.length} audit template{templates.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="divide-y">
        {templates.map((template) => {
          const itemCount = template.sections.reduce((total, section) => total + section.items.length, 0);

          return (
            <div
              key={template.id}
              className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1.6fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_140px] md:items-center"
            >
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{template.title}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Reusable audit template
                  </p>
                </div>
              </div>
              <div className="min-w-0 text-xs">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Items</span>
                <span className="block truncate font-semibold">{itemCount}</span>
              </div>
              <div className="min-w-0 text-xs">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Sections</span>
                <span className="block truncate font-semibold">{template.sections.length}</span>
              </div>
              <div className={cn(CARD_HEADER_ACTION_ZONE_CLASS, 'flex items-center justify-end gap-1')}>
                <StartAuditDialog
                  template={template}
                  tenantId={tenantId}
                  personnel={personnel}
                  departments={departments}
                  organizations={organizations}
                  trigger={
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-[9px] font-black uppercase">
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Create Audit</span>
                    </Button>
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Actions for ${template.title}`}
                      className={cn(PAGE_FORMAT_HEADER_COMPACT_DROPDOWN_BUTTON_CLASS, 'h-8 w-8 p-0')}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <ChevronsUpDown className="sr-only" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => onEditTemplate(template)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-amber-700"
                      onClick={() => void handleArchive(template.id, template.title)}
                    >
                      <Archive className="mr-2 h-3.5 w-3.5" /> Archive Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
