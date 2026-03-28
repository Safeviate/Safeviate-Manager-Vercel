
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Edit, Settings, FileText, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentUploader } from '@/app/(app)/users/personnel/[id]/document-uploader';
import Image from 'next/image';

const cleanData = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanData(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined) {
                acc[key] = cleanData(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

// --- Details Dialog ---
const detailsSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  abbreviation: z.string().optional(),
  type: z.string().optional(),
  frameHours: z.coerce.number().optional(),
  engineHours: z.coerce.number().optional(),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
  tachoAtNext50Inspection: z.coerce.number().optional(),
  tachoAtNext100Inspection: z.coerce.number().optional(),
});
type DetailsFormValues = z.infer<typeof detailsSchema>;

function EditDetailsDialog({ aircraft, tenantId, children }: { aircraft: Aircraft; tenantId: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      make: aircraft.make || '',
      model: aircraft.model || '',
      tailNumber: aircraft.tailNumber || '',
      abbreviation: aircraft.abbreviation || '',
      type: aircraft.type || 'Single-Engine',
      frameHours: aircraft.frameHours || 0,
      engineHours: aircraft.engineHours || 0,
      initialHobbs: aircraft.initialHobbs || 0,
      currentHobbs: aircraft.currentHobbs || 0,
      initialTacho: aircraft.initialTacho || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    },
  });

  const onSubmit = (values: DetailsFormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    const cleanedValues = cleanData(values);
    updateDocumentNonBlocking(aircraftRef, cleanedValues);
    toast({ title: 'Aircraft Details Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Edit Aircraft Details</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="abbreviation" render={({ field }) => (<FormItem><FormLabel>Abbreviation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="frameHours" render={({ field }) => (<FormItem><FormLabel>Frame Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="engineHours" render={({ field }) => (<FormItem><FormLabel>Engine Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 50hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel>Tacho at Next 100hr</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save Details</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Components Dialog ---
const componentSchema = z.object({
  id: z.string(),
  manufacturer: z.string().optional().default(''),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().optional().default(''),
  serialNumber: z.string().optional().default(''),
  installDate: z.date().optional(),
  installHours: z.coerce.number().optional().default(0),
  maxHours: z.coerce.number().optional().default(0),
  notes: z.string().optional().default(''),
  tsn: z.coerce.number().optional().default(0),
  tso: z.coerce.number().optional().default(0),
});
const componentsSchema = z.object({ components: z.array(componentSchema) });
type ComponentsFormValues = z.infer<typeof componentsSchema>;

function EditComponentsDialog({ aircraft, tenantId, children }: { aircraft: Aircraft; tenantId: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ComponentsFormValues>({
    resolver: zodResolver(componentsSchema),
    defaultValues: {
      components: aircraft.components?.map(c => ({
          ...c,
          installDate: c.installDate ? new Date(c.installDate) : undefined,
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  });

  const onSubmit = (values: ComponentsFormValues) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    const dataToSave = {
        components: values.components.map(c => ({
            ...c,
            installDate: c.installDate ? format(c.installDate, 'yyyy-MM-dd') : null,
        }))
    };
    updateDocumentNonBlocking(aircraftRef, cleanData(dataToSave));
    toast({ title: 'Components Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Edit Tracked Components</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => (<FormItem><FormLabel>Serial No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => (<FormItem><FormLabel>Install Hours (Tacho)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => (<FormItem><FormLabel>Max Hours (TBO/Life)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => (<FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => (<FormItem><FormLabel>Time Since Overhaul (TSO)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.notes`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    append({
                      id: uuidv4(),
                      name: '',
                      manufacturer: '',
                      partNumber: '',
                      serialNumber: '',
                      installDate: new Date(),
                      installHours: 0,
                      maxHours: 0,
                      notes: '',
                      tsn: 0,
                      tso: 0,
                    })
                  }
                >
                  <PlusCircle className="mr-2" />Add Component
                </Button>
              </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save Components</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Documents Dialog ---
function ManageDocumentsDialog({ aircraft, tenantId, children }: { aircraft: Aircraft; tenantId: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [documents, setDocuments] = useState(aircraft.documents || []);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
        setDocuments(prev => [...prev, docDetails]);
    };

    const handleDocumentDelete = (docUrl: string) => {
        setDocuments(prev => prev.filter(doc => doc.url !== docUrl));
    };

    const handleSaveChanges = () => {
        if (!firestore) return;
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { documents });
        toast({ title: 'Documents Updated' });
        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Aircraft Documents</DialogTitle>
                    <DialogDescription>Upload, view, or delete documents for {aircraft.tailNumber}.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <DocumentUploader
                        onDocumentUploaded={handleDocumentUploaded}
                        trigger={(openDialog) => (
                            <Button variant="outline" onClick={() => openDialog('file')} className="w-full">
                                <PlusCircle className="mr-2" /> Upload New Document
                            </Button>
                        )}
                    />
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="font-medium truncate pr-4">{doc.name}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDocumentDelete(doc.url)}>
                                    <Trash2 className="h-4" />
                                </Button>
                            </div>
                        ))}
                         {documents.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No documents uploaded.</p>}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Actions Component ---
export function AircraftEditActions({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <div className="flex gap-2">
      <EditDetailsDialog aircraft={aircraft} tenantId={tenantId}>
        <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Details</Button>
      </EditDetailsDialog>
      <EditComponentsDialog aircraft={aircraft} tenantId={tenantId}>
        <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Manage Components</Button>
      </EditComponentsDialog>
      <ManageDocumentsDialog aircraft={aircraft} tenantId={tenantId}>
        <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Manage Documents</Button>
      </ManageDocumentsDialog>
    </div>
  );
}
