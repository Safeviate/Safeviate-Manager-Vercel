
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export type StationArm = {
  frontSeats?: number;
  rearSeats?: number;
  fuel?: number;
  baggage1?: number;
  baggage2?: number;
};

export type CgEnvelopePoint = [number, number];

export interface AircraftModelProfile {
  id: string;
  make: string;
  model: string;
  emptyWeight?: number;
  emptyWeightMoment?: number;
  maxTakeoffWeight?: number;
  maxLandingWeight?: number;
  stationArms?: StationArm;
  cgEnvelope?: CgEnvelopePoint[];
}

interface TemplateFormProps {
    tenantId: string;
    initialData: AircraftModelProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

const formSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  emptyWeight: z.number().optional(),
  emptyWeightMoment: z.number().optional(),
  maxTakeoffWeight: z.number().optional(),
  maxLandingWeight: z.number().optional(),
  stationArms: z.object({
    frontSeats: z.number().optional(),
    rearSeats: z.number().optional(),
    fuel: z.number().optional(),
    baggage1: z.number().optional(),
    baggage2: z.number().optional(),
  }).optional(),
  cgEnvelope: z.array(z.tuple([z.number(), z.number()])).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function MassBalanceTemplateForm({ tenantId, initialData, isOpen, onClose }: TemplateFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [localEnvelope, setLocalEnvelope] = useState<CgEnvelopePoint[]>(initialData?.cgEnvelope || []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: initialData?.make || '',
      model: initialData?.model || '',
      emptyWeight: initialData?.emptyWeight || 0,
      emptyWeightMoment: initialData?.emptyWeightMoment || 0,
      maxTakeoffWeight: initialData?.maxTakeoffWeight || 0,
      maxLandingWeight: initialData?.maxLandingWeight || 0,
      stationArms: initialData?.stationArms || {},
      cgEnvelope: initialData?.cgEnvelope || [],
    },
  });
  
  useEffect(() => {
    form.reset({
        make: initialData?.make || '',
        model: initialData?.model || '',
        emptyWeight: initialData?.emptyWeight || 0,
        emptyWeightMoment: initialData?.emptyWeightMoment || 0,
        maxTakeoffWeight: initialData?.maxTakeoffWeight || 0,
        maxLandingWeight: initialData?.maxLandingWeight || 0,
        stationArms: initialData?.stationArms || {},
        cgEnvelope: initialData?.cgEnvelope || [],
    });
    setLocalEnvelope(initialData?.cgEnvelope || []);
  }, [initialData, form]);

  const addEnvelopePoint = () => setLocalEnvelope(prev => [...prev, [0,0]]);
  const removeEnvelopePoint = (index: number) => setLocalEnvelope(prev => prev.filter((_, i) => i !== index));
  const updateEnvelopePoint = (index: number, pos: 0 | 1, value: string) => {
    const newPoint: CgEnvelopePoint = [...localEnvelope[index]];
    newPoint[pos] = Number(value);
    setLocalEnvelope(prev => prev.map((p, i) => i === index ? newPoint : p));
  };


  const onSubmit = (data: FormValues) => {
    if (!firestore) return;
    const dataToSave = { ...data, cgEnvelope: localEnvelope };

    if (isEditing && initialData) {
      const docRef = doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', initialData.id);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Template Updated', description: `The W&B template for ${data.model} has been updated.` });
    } else {
      const collectionRef = collection(firestore, 'tenants', tenantId, 'aircraftModelProfiles');
      addDocumentNonBlocking(collectionRef, dataToSave);
      toast({ title: 'Template Created', description: `A new W&B template for ${data.model} has been saved.` });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!firestore || !isEditing || !initialData) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', initialData.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Template Deleted', description: `The W&B template has been deleted.` });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{isEditing ? `Edit ${initialData.make} ${initialData.model}` : 'Create New W&B Template'}</DialogTitle>
                <DialogDescription>
                    Define the weight and balance parameters for an aircraft model.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <ScrollArea className="h-[70vh] p-1">
                        <div className="space-y-6 px-4 py-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="make" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Make</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g., Cessna" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="model" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g., 172S" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                             </div>
                            
                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Weight & Limits</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="emptyWeight" render={({ field }) => (
                                        <FormItem><FormLabel>Empty Weight (lbs)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="emptyWeightMoment" render={({ field }) => (
                                        <FormItem><FormLabel>Empty Moment (lb-in)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="maxTakeoffWeight" render={({ field }) => (
                                        <FormItem><FormLabel>Max Takeoff Weight</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="maxLandingWeight" render={({ field }) => (
                                        <FormItem><FormLabel>Max Landing Weight</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Station Arms (inches from datum)</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="stationArms.frontSeats" render={({ field }) => (
                                        <FormItem><FormLabel>Front Seats</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="stationArms.rearSeats" render={({ field }) => (
                                        <FormItem><FormLabel>Rear Seats</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="stationArms.fuel" render={({ field }) => (
                                        <FormItem><FormLabel>Fuel Tank(s)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="stationArms.baggage1" render={({ field }) => (
                                        <FormItem><FormLabel>Baggage Area 1</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="stationArms.baggage2" render={({ field }) => (
                                        <FormItem><FormLabel>Baggage Area 2</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">CG Envelope Points</h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addEnvelopePoint}>Add Point</Button>
                                </div>
                                <div className='space-y-2 p-4 border rounded-md'>
                                     {localEnvelope.map((point, index) => (
                                        <div key={index} className="flex gap-4 items-center">
                                            <Label className='w-20'>Point {index + 1}</Label>
                                            <Input type="number" placeholder="Weight (lbs)" value={point[0]} onChange={e => updateEnvelopePoint(index, 0, e.target.value)} />
                                            <Input type="number" placeholder="CG (in)" value={point[1]} onChange={e => updateEnvelopePoint(index, 1, e.target.value)} />
                                            <Button type="button" size="icon" variant="ghost" onClick={() => removeEnvelopePoint(index)}><Trash2 className='h-4 w-4'/></Button>
                                        </div>
                                     ))}
                                     {localEnvelope.length === 0 && <p className='text-sm text-muted-foreground text-center'>No envelope points defined.</p>}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </form>
            </Form>
            <DialogFooter className='border-t pt-4 mt-4'>
                {isEditing && (
                    <Button variant="destructive" onClick={handleDelete} className='mr-auto'>Delete Template</Button>
                )}
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={form.handleSubmit(onSubmit)}><Save className='mr-2'/> Save Template</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
