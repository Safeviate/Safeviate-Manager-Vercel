
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, GripVertical, Trash2, Wand2, Library } from 'lucide-react';
import type { QualityAuditChecklistTemplate, AuditChecklistItem, ChecklistSection, ComplianceRequirement } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AiChecklistGenerator } from './ai-checklist-generator';
import { ImportFromMatrixDialog } from './import-from-matrix-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';


const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Item text is required.'),
  type: z.enum(['Checkbox', 'Textbox', 'Number', 'Date']),
  regulationReference: z.string().optional(),
});

const sectionSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Section title is required'),
    items: z.array(checklistItemSchema)
});

const formSchema = z.object({
  title: z.string().min(1, 'Template title is required.'),
  departmentId: z.string().min(1, 'Department is required.'),
  sections: z.array(sectionSchema).min(1, 'At least one section is required.'),
});

export type FormValues = z.infer<typeof formSchema>;

interface NewChecklistDialogProps {
  tenantId: string;
  departments: Department[];
  existingTemplate?: QualityAuditChecklistTemplate;
  trigger?: React.ReactNode;
}

export function NewChecklistDialog({
  tenantId,
  departments,
  existingTemplate,
  trigger,
}: NewChecklistDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Drag-and-drop state for sections
  const dragSectionNode = useRef<HTMLDivElement | null>(null);
  
  const complianceQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/compliance-matrix`)) : null),
    [firestore, tenantId]
  );
  const { data: complianceItems } = useCollection<ComplianceRequirement>(complianceQuery);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingTemplate || {
      title: '',
      departmentId: '',
      sections: [],
    },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({
    control: form.control,
    name: 'sections',
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingTemplate || { title: '', departmentId: '', sections: [] });
    }
  }, [isOpen, existingTemplate, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !tenantId) {
      toast({
        variant: 'destructive',
        title: 'Tenant not ready',
        description: 'Please wait for tenant context to load, then try again.',
      });
      return;
    }
    
    const dataToSave = {
        ...values,
        sections: values.sections.map(section => ({
            ...section,
            items: section.items.map(item => ({
                id: item.id || uuidv4(), 
                text: item.text,
                type: item.type,
                regulationReference: item.regulationReference,
            }))
        }))
    }

    if (existingTemplate) {
        const templateRef = doc(firestore, `tenants/${tenantId}/quality-audit-templates`, existingTemplate.id);
        updateDocumentNonBlocking(templateRef, dataToSave);
        toast({ title: 'Template Updated', description: 'The checklist template has been saved.' });
    } else {
        const templatesCollection = collection(firestore, `tenants/${tenantId}/quality-audit-templates`);
        addDocumentNonBlocking(templatesCollection, dataToSave);
        toast({ title: 'Template Created', description: 'The new checklist template has been saved.' });
    }
    
    setIsOpen(false);
  };

  const handleAiGeneratedSections = (sections: ChecklistSection[]) => {
    form.setValue('sections', sections, { shouldValidate: true });
    toast({
        title: 'Checklist Generated',
        description: `${sections.length} sections have been added to the form.`
    })
  }

  const handleImportFromMatrix = (importedSections: ChecklistSection[]) => {
      form.setValue('sections', [...form.getValues('sections'), ...importedSections]);
      toast({
          title: 'Imported from Matrix',
          description: `${importedSections.length} sections have been added to your checklist.`
      })
  }

  // Section Drag Handlers
  const handleSectionDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragSectionNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  
  const handleSectionDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    if (dragSectionNode.current && e.currentTarget !== dragSectionNode.current) {
        e.currentTarget.classList.add('border-primary', 'border-dashed', 'border-2');
    }
  };

  const handleSectionDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-primary', 'border-dashed', 'border-2');
  };

  const handleSectionDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedIndex = Number(e.dataTransfer.getData('text/plain'));
    const targetIndex = Number(e.currentTarget.dataset.index);
    if (!isNaN(draggedIndex) && !isNaN(targetIndex)) {
        moveSection(draggedIndex, targetIndex);
    }
    e.currentTarget.classList.remove('border-primary', 'border-dashed', 'border-2');
    dragSectionNode.current = null;
  };
  
  const SectionItems = ({ sectionIndex }: { sectionIndex: number }) => {
      const { fields, append, remove, move } = useFieldArray({
          control: form.control,
          name: `sections.${sectionIndex}.items`
      });

      const dragItemNode = useRef<HTMLDivElement | null>(null);

      const addItem = (type: AuditChecklistItem['type']) => {
        append({ id: uuidv4(), text: '', type, regulationReference: '' });
      };

      const handleItemDragStart = (e: React.DragEvent, index: number) => {
          dragItemNode.current = e.currentTarget as HTMLDivElement;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
      };

      const handleItemDragOver = (e: React.DragEvent, index: number) => {
          e.preventDefault();
          if (dragItemNode.current && e.currentTarget !== dragItemNode.current) {
             (e.currentTarget as HTMLDivElement).classList.add('border-primary', 'border-dashed', 'border-2');
          }
      };

      const handleItemDragLeave = (e: React.DragEvent) => {
        (e.currentTarget as HTMLDivElement).classList.remove('border-primary', 'border-dashed', 'border-2');
      };

      const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedIndex = Number(e.dataTransfer.getData('text/plain'));
        if (!isNaN(draggedIndex) && !isNaN(targetIndex)) {
            move(draggedIndex, targetIndex);
        }
        (e.currentTarget as HTMLDivElement).classList.remove('border-primary', 'border-dashed', 'border-2');
        dragItemNode.current = null;
      };

      return (
          <div className="pl-4 border-l-2 ml-2 space-y-3">
             {fields.map((item, itemIndex) => (
                 <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, itemIndex)}
                    onDragOver={(e) => handleItemDragOver(e, itemIndex)}
                    onDragLeave={handleItemDragLeave}
                    onDrop={(e) => handleItemDrop(e, itemIndex)}
                    className="flex items-start gap-2 p-3 border rounded-lg bg-background transition-shadow"
                >
                     <GripVertical className="h-5 w-5 mt-8 text-muted-foreground cursor-grab" />
                     <div className="grid grid-cols-1 gap-4 flex-1">
                        <FormField control={form.control} name={`sections.${sectionIndex}.items.${itemIndex}.text`} render={({ field }) => ( <FormItem><FormLabel>Item Text (Type: {item.type})</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`sections.${sectionIndex}.items.${itemIndex}.regulationReference`} render={({ field }) => ( <FormItem><FormLabel>Regulation Ref.</FormLabel><FormControl><Input placeholder="e.g., EASA.ORO.FC.115" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     </div>
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(itemIndex)} className="mt-6 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                 </div>
             ))}
              <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Checkbox')}><PlusCircle className="mr-2 h-4 w-4" />Checkbox</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Textbox')}><PlusCircle className="mr-2 h-4 w-4" />Textbox</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Number')}><PlusCircle className="mr-2 h-4 w-4" />Number</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Date')}><PlusCircle className="mr-2 h-4 w-4" />Date</Button>
                </div>
          </div>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant={isMobile ? 'outline' : 'default'}
            className={cn(
              isMobile
                ? 'w-full justify-between bg-white px-3 text-slate-900 shadow-sm border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100'
                : ''
            )}
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              New Checklist Template
            </span>
            {isMobile ? <Library className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-full sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{existingTemplate ? 'Edit' : 'New'} Checklist Template</DialogTitle>
          <DialogDescription>
            Build a reusable checklist with sections and items for conducting quality audits.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[70vh] pr-6">
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Template Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="departmentId" render={({ field }) => ( <FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
                
                <Separator />
                
                <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4"> {/* Updated responsive classes */}
                        <h3 className="text-lg font-medium mb-2 sm:mb-0">Sections</h3> {/* Added responsive margin */}
                        <div className="flex flex-wrap gap-2 justify-end sm:justify-start"> {/* Added flex-wrap and justify-end */}
                            <ImportFromMatrixDialog 
                                complianceItems={complianceItems || []}
                                onImport={handleImportFromMatrix}
                            />
                            <AiChecklistGenerator onGenerated={handleAiGeneratedSections} />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => appendSection({ id: uuidv4(), title: '', items: [] })}
                                className="w-full sm:w-auto"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                            </Button>
                        </div>
                    </div>
                     {sectionFields.map((section, index) => (
                        <div
                            key={section.id}
                            data-index={index}
                            draggable
                            onDragStart={(e) => handleSectionDragStart(e, index)}
                            onDragOver={handleSectionDragOver}
                            onDragLeave={handleSectionDragLeave}
                            onDrop={handleSectionDrop}
                        >
                            <Card 
                                className="mb-4 bg-muted/30 transition-shadow"
                            >
                                <CardHeader>
                                    <div className="flex items-start gap-2">
                                        <GripVertical className="h-5 w-5 mt-2 text-muted-foreground cursor-grab" />
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name={`sections.${index}.title`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Section Title</FormLabel>
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(index)} className="mt-6 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <SectionItems sectionIndex={index} />
                                </CardContent>
                            </Card>
                         </div>
                     ))}
                     {sectionFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sections yet. Add one to get started.</p>}
                     <FormField control={form.control} name="sections" render={() => <FormMessage />} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Save Template</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
