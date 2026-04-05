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
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Edit, Settings, FileText, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentUploader } from '@/components/document-uploader';

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

function EditDetailsDialog({ aircraft, children }: { aircraft: Aircraft; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
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

  const onSubmit = async (values: DetailsFormValues) => {
    try {
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, ...cleanData(values) } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update aircraft.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        toast({ title: 'Aircraft Details Updated' });
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-xl font-black uppercase">Edit Aircraft Primary Data</DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase text-muted-foreground">Modify technical metadata and operational hour offsets for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-hidden flex flex-col">
             <ScrollArea className="flex-1 p-6">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Make</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Model</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Tail Number</FormLabel><FormControl><Input className="h-10 font-black uppercase" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="abbreviation" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Abbr</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4">
                    <FormField control={form.control} name="frameHours" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Frame Hours</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="engineHours" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Engine Hours</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="initialHobbs" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Init Hobbs</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentHobbs" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Curr Hobbs</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="initialTacho" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Init Tacho</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentTacho" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Curr Tacho</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Next 50hr</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Next 100hr</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 border-t bg-muted/5"><DialogClose asChild><Button type="button" variant="outline" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose><Button type="submit" className="text-[10px] font-black uppercase px-8 shadow-md">Apply Metadata Updates</Button></DialogFooter>
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

function EditComponentsDialog({ aircraft, children }: { aircraft: Aircraft; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
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

  const onSubmit = async (values: ComponentsFormValues) => {
    try {
        const dataToSave = {
            components: values.components.map(c => ({
                ...c,
                installDate: c.installDate ? format(c.installDate, 'yyyy-MM-dd') : null,
            }))
        };
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, ...cleanData(dataToSave) } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update components.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        
        toast({ title: 'Components Updated' });
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-xl font-black uppercase">Component Lifecycle Audit</DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase text-muted-foreground">Track installed parts, serial numbers, and maintenance intervals for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-6 border-2 rounded-2xl bg-muted/5 relative transition-all hover:bg-muted/10">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField control={form.control} name={`components.${index}.name`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Component Name</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.manufacturer`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Manufacturer</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.partNumber`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Part No.</FormLabel><FormControl><Input className="h-10 font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.serialNumber`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Serial No.</FormLabel><FormControl><Input className="h-10 font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.installDate`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Install Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("h-10 pl-3 text-left font-bold text-xs uppercase tracking-tight", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.installHours`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Install At (Tacho)</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.maxHours`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Max Life (TBO)</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.tsn`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">TSN</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.tso`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">TSO</FormLabel><FormControl><Input className="h-10 font-mono font-bold" type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`components.${index}.notes`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Notes / Observations</FormLabel><FormControl><Input className="h-10 font-medium" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-dashed border-2 text-[10px] font-black uppercase tracking-widest"
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
                  <PlusCircle className="mr-2 h-4 w-4" />Register New Tracked Component
                </Button>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 border-t bg-muted/5"><DialogClose asChild><Button type="button" variant="outline" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose><Button type="submit" className="text-[10px] font-black uppercase px-8 shadow-md">Sync Component Log</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Documents Dialog ---
function ManageDocumentsDialog({ aircraft, children }: { aircraft: Aircraft; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [documents, setDocuments] = useState(aircraft.documents || []);
    const { toast } = useToast();

    const handleDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
        setDocuments(prev => [...prev, docDetails]);
    };

    const handleDocumentDelete = (docUrl: string) => {
        setDocuments(prev => prev.filter(doc => doc.url !== docUrl));
    };

    const handleSaveChanges = async () => {
        try {
            const response = await fetch(`/api/aircraft/${aircraft.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ aircraft: { ...aircraft, documents } }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Failed to update documents.');
            window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
            toast({ title: 'Documents Updated' });
            setIsOpen(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="text-xl font-black uppercase">Technical Library</DialogTitle>
                    <DialogDescription className="text-xs font-medium uppercase text-muted-foreground">Upload, view, or delete airworthiness documents for {aircraft.tailNumber}.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
                    <DocumentUploader
                        onDocumentUploaded={handleDocumentUploaded}
                        trigger={(openDialog) => (
                            <Button variant="outline" onClick={() => openDialog('file')} className="w-full h-12 border-dashed border-2 text-[10px] font-black uppercase tracking-widest">
                                <PlusCircle className="mr-2 h-4 w-4" /> Upload New Airworthiness Document
                            </Button>
                        )}
                    />
                    <div className="flex-1 overflow-auto space-y-3 pr-2">
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border-2 rounded-2xl bg-background shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black uppercase tracking-tight truncate max-w-[300px]">{doc.name}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Uploaded: {format(new Date(doc.uploadDate), 'dd MMM yyyy')}</span>
                                </div>
                                <div className="flex gap-2">
                                     <a href={doc.url} target="_blank" rel="noreferrer">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10">
                                            <FileText className="h-5 w-5" />
                                        </Button>
                                    </a>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDocumentDelete(doc.url)}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                         {documents.length === 0 && (
                            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/5">
                                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Empty Archive</p>
                            </div>
                         )}
                    </div>
                </div>
                <DialogFooter className="p-6 border-t bg-muted/5">
                    <DialogClose asChild><Button type="button" variant="outline" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} className="text-[10px] font-black uppercase px-8 shadow-md">Sync Document Archive</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Actions Component ---
export function AircraftEditActions({ aircraft }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <EditDetailsDialog aircraft={aircraft}>
        <Button variant="outline" className="text-[10px] font-black uppercase tracking-tight gap-2 h-10 border-2 hover:bg-muted/50"><Edit className="h-4 w-4" /> Edit Details</Button>
      </EditDetailsDialog>
      <EditComponentsDialog aircraft={aircraft}>
        <Button variant="outline" className="text-[10px] font-black uppercase tracking-tight gap-2 h-10 border-2 hover:bg-muted/50"><Settings className="h-4 w-4" /> Components</Button>
      </EditComponentsDialog>
      <ManageDocumentsDialog aircraft={aircraft}>
        <Button variant="outline" className="text-[10px] font-black uppercase tracking-tight gap-2 h-10 border-2 hover:bg-muted/50"><FileText className="h-4 w-4" /> Documents</Button>
      </ManageDocumentsDialog>
    </div>
  );
}
