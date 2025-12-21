
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
import type { QualityAuditChecklistTemplate, AuditChecklistItem } from '@/types/quality';
import type { Department } from '../../admin/department/page';

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Item text is required.'),
  type: z.enum(['Header', 'Checkbox', 'Textbox', 'Number', 'Date']),
  regulationReference: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, 'Template title is required.'),
  departmentId: z.string().min(1, 'Department is required.'),
  items: z.array(checklistItemSchema).min(1, 'At least one checklist item is required.'),
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
      items: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (isOpen) {
        form.reset(existingTemplate || { title: '', departmentId: '', items: [] });
    }
  }, [isOpen, existingTemplate, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;

    if (existingTemplate) {
        // Update existing
        const templateRef = doc(firestore, `tenants/${tenantId}/quality-audit-templates`, existingTemplate.id);
        updateDocumentNonBlocking(templateRef, values);
        toast({ title: 'Template Updated', description: 'The checklist template has been saved.' });
    } else {
        // Create new
        const templatesCollection = collection(firestore, `tenants/${tenantId}/quality-audit-templates`);
        addDocumentNonBlocking(templatesCollection, values);
        toast({ title: 'Template Created', description: 'The new checklist template has been saved.' });
    }
    
    setIsOpen(false);
  };

  const addItem = (type: AuditChecklistItem['type']) => {
    append({
        id: uuidv4(),
        text: '',
        type,
        regulationReference: '',
    });
  };

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
            Build a reusable checklist for conducting quality audits.
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
                
                <div>
                    <h3 className="text-lg font-medium mb-2">Checklist Items</h3>
                     {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg mb-2 bg-muted/20">
                            <GripVertical className="h-5 w-5 mt-9 text-muted-foreground" />
                            <div className="grid grid-cols-3 gap-4 flex-1">
                                <FormField control={form.control} name={`items.${index}.text`} render={({ field }) => ( <FormItem className="col-span-3"><FormLabel>Item Text ({`Type: ${form.getValues(`items.${index}.type`)}`})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name={`items.${index}.regulationReference`} render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Regulation Ref.</FormLabel><FormControl><Input placeholder="e.g., EASA.ORO.FC.115" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                     ))}
                     {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items yet. Add one below.</p>}
                     <FormField control={form.control} name="items" render={() => <FormMessage />} />
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Header')}><PlusCircle className="mr-2" />Header</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Checkbox')}><PlusCircle className="mr-2" />Checkbox</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Textbox')}><PlusCircle className="mr-2" />Textbox</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Number')}><PlusCircle className="mr-2" />Number</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem('Date')}><PlusCircle className="mr-2" />Date</Button>
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
