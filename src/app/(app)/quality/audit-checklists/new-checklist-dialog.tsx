
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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
import { PlusCircle, GripVertical, Trash2 } from 'lucide-react';
import type { QualityAuditChecklistTemplate, AuditChecklistItem, ChecklistSection } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

type FormValues = z.infer<typeof formSchema>;

interface NewChecklistDialogProps {
  tenantId: string;
  departments: Department[];
  existingTemplate?: QualityAuditChecklistTemplate;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function NewChecklistDialog({
  tenantId,
  departments,
  existingTemplate,
  isOpen: controlledIsOpen,
  setIsOpen: setControlledIsOpen,
  trigger,
}: NewChecklistDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = setControlledIsOpen ?? setInternalIsOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingTemplate || {
      title: '',
      departmentId: '',
      sections: [],
    },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: 'sections',
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingTemplate || { title: '', departmentId: '', sections: [] });
    }
  }, [isOpen, existingTemplate, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    
    // Create a deep copy and ensure IDs are present
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
        // Update existing
        const templateRef = doc(firestore, `tenants/${tenantId}/quality-audit-templates`, existingTemplate.id);
        updateDocumentNonBlocking(templateRef, dataToSave);
        toast({ title: 'Template Updated', description: 'The checklist template has been saved.' });
    } else {
        // Create new
        const templatesCollection = collection(firestore, `tenants/${tenantId}/quality-audit-templates`);
        addDocumentNonBlocking(templatesCollection, dataToSave);
        toast({ title: 'Template Created', description: 'The new checklist template has been saved.' });
    }
    
    setIsOpen(false);
  };
  
  const SectionItems = ({ sectionIndex }: { sectionIndex: number }) => {
      const { fields, append, remove } = useFieldArray({
          control: form.control,
          name: `sections.${sectionIndex}.items`
      });

      const addItem = (type: AuditChecklistItem['type']) => {
        append({
            id: uuidv4(),
            text: '',
            type,
            regulationReference: '',
        });
      };

      return (
          <div className="pl-4 border-l-2 ml-2 space-y-3">
             {fields.map((item, itemIndex) => (
                 <div key={item.id} className="flex items-start gap-2 p-3 border rounded-lg bg-background">
                     <GripVertical className="h-5 w-5 mt-8 text-muted-foreground" />
                     <div className="grid grid-cols-1 gap-4 flex-1">
                        <FormField control={form.control} name={`sections.${sectionIndex}.items.${itemIndex}.text`} render={({ field }) => ( <FormItem><FormLabel>Item Text (Type: {item.type})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
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
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Checklist Template
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl">
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
                    <h3 className="text-lg font-medium mb-4">Sections</h3>
                     {sectionFields.map((section, index) => (
                        <Card key={section.id} className="mb-4 bg-muted/30">
                            <CardHeader>
                                <div className="flex items-start gap-2">
                                     <GripVertical className="h-5 w-5 mt-2 text-muted-foreground" />
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
                     ))}
                     {sectionFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sections yet. Add one to get started.</p>}
                     <FormField control={form.control} name="sections" render={() => <FormMessage />} />
                </div>
                
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => appendSection({ id: uuidv4(), title: '', items: [] })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                </Button>
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
