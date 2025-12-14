
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label as RechartsLabel,
  ReferenceDot,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, Save, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isPointInPolygon } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];


export type Station = {
    id: number;
    name: string;
    weight: number;
    arm: number;
};

export type CgEnvelopePoint = {
    x: number;
    y: number;
};

export interface AircraftModelProfile {
  id: string;
  make: string;
  model: string;
  stations?: Station[];
  cgEnvelope?: CgEnvelopePoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

interface TemplateFormProps {
    tenantId: string;
    initialData?: AircraftModelProfile | null;
}

const formSchema = z.object({
  modelName: z.string().min(1, 'Model name is required.'),
  xMin: z.coerce.number().optional(),
  xMax: z.coerce.number().optional(),
  yMin: z.coerce.number().optional(),
  yMax: z.coerce.number().optional(),
  stations: z.array(z.object({
    id: z.coerce.number(),
    name: z.string().min(1, 'Station name is required.'),
    weight: z.coerce.number(),
    arm: z.coerce.number(),
  })).optional(),
  cgEnvelope: z.array(z.object({
    x: z.coerce.number(),
    y: z.coerce.number(),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function MassBalanceTemplateForm({ tenantId, initialData }: TemplateFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const isEditing = !!initialData;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const watchedStations = useWatch({ control: form.control, name: 'stations' });
  const watchedEnvelope = useWatch({ control: form.control, name: 'cgEnvelope' });
  const watchedXMin = useWatch({ control: form.control, name: 'xMin' });
  const watchedXMax = useWatch({ control: form.control, name: 'xMax' });
  const watchedYMin = useWatch({ control: form.control, name: 'yMin' });
  const watchedYMax = useWatch({ control: form.control, name: 'yMax' });
  
  const { fields: stationFields, append: appendStation, remove: removeStation } = useFieldArray({
    control: form.control,
    name: "stations",
  });
  
  const { fields: envelopeFields, append: appendEnvelope, remove: removeEnvelope } = useFieldArray({
    control: form.control,
    name: "cgEnvelope",
  });

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  useEffect(() => {
    let totalMom = 0;
    let totalWt = 0;
    const stations = watchedStations || [];
    stations.forEach(st => {
      const wt = parseFloat(st.weight as any) || 0;
      const arm = parseFloat(st.arm as any) || 0;
      totalWt += wt;
      totalMom += (wt * arm);
    });
    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    const safe = (watchedEnvelope?.length || 0) > 2 
        ? isPointInPolygon({ x: cg, y: totalWt }, watchedEnvelope || []) 
        : false;
    setResults({ 
      cg: parseFloat(cg.toFixed(2)), 
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe
    });
  }, [watchedStations, watchedEnvelope]);


  useEffect(() => {
    const modelName = initialData ? `${initialData.make} ${initialData.model}` : '';
    form.reset({
        modelName: modelName,
        xMin: initialData?.xMin || 0,
        xMax: initialData?.xMax || 0,
        yMin: initialData?.yMin || 0,
        yMax: initialData?.yMax || 0,
        stations: initialData?.stations || [],
        cgEnvelope: initialData?.cgEnvelope || [],
    });
  }, [initialData, form]);

  const onSubmit = (data: FormValues) => {
    if (!firestore) return;
    
    const [make, ...modelParts] = data.modelName.split(' ');
    const model = modelParts.join(' ');

    const dataToSave = { 
        ...data,
        make: make || 'Unknown',
        model: model || data.modelName,
    };
    delete (dataToSave as any).modelName;

    if (isEditing && initialData) {
      const docRef = doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', initialData.id);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Profile Updated', description: `The W&B profile for ${data.modelName} has been updated.` });
    } else {
      const collectionRef = collection(firestore, 'tenants', tenantId, 'aircraftModelProfiles');
      addDocumentNonBlocking(collectionRef, dataToSave);
      toast({ title: 'Profile Created', description: `A new W&B profile for ${data.modelName} has been saved.` });
    }
    router.push('/assets/mass-balance');
  };

  const handleDelete = () => {
    if (!firestore || !isEditing || !initialData) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', initialData.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Profile Deleted', description: `The W&B profile has been deleted.` });
    router.push('/assets/mass-balance');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>This chart visualizes the data as you enter it.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center">
               <div className='flex justify-center mb-4'>
                    <Badge className={cn(results.isSafe ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-lg text-white px-6 py-2')}>
                        {results.isSafe ? 'Within Limits' : 'Out of Limits'}
                    </Badge>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[watchedXMin || 'dataMin', watchedXMax || 'dataMax']} allowDataOverflow={true}>
                           <RechartsLabel value="Center of Gravity (inches)" offset={-25} position="insideBottom" dy={10} />
                        </XAxis>
                        <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[watchedYMin || 'dataMin', watchedYMax || 'dataMax']} allowDataOverflow={true} >
                             <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Envelope" data={watchedEnvelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} fill="transparent" shape={() => null} />
                        <Scatter name="Envelope Points" data={watchedEnvelope}>
                            {(watchedEnvelope || []).map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} />
                            ))}
                        </Scatter>
                        <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stroke="hsl(var(--primary-foreground))" strokeWidth={2} />
                    </ScatterChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle>{isEditing ? `Edit ${initialData?.make} ${initialData?.model}` : 'Create New W&B Profile'}</CardTitle>
              <CardDescription>Define the weight and balance parameters for an aircraft model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="modelName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Cessna 172S" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Separator />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Loading Stations</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendStation({ id: Date.now(), name: '', weight: 0, arm: 0 })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {stationFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                      <FormField control={form.control} name={`stations.${index}.name`} render={({ field }) => (
                        <FormItem className="col-span-5"><FormControl><Input {...field} placeholder="Station Name" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`stations.${index}.weight`} render={({ field }) => (
                        <FormItem className="col-span-3"><FormControl><Input type="number" {...field} placeholder="Weight" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`stations.${index}.arm`} render={({ field }) => (
                        <FormItem className="col-span-3"><FormControl><Input type="number" {...field} placeholder="Arm" /></FormControl></FormItem>
                      )} />
                      <Button type="button" onClick={() => removeStation(index)} variant="ghost" size="icon" className="col-span-1 text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 size={16} /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Chart Axis Limits</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField control={form.control} name="xMin" render={({ field }) => (
                    <FormItem><FormLabel>Min CG</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="xMax" render={({ field }) => (
                    <FormItem><FormLabel>Max CG</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yMin" render={({ field }) => (
                    <FormItem><FormLabel>Min Weight</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yMax" render={({ field }) => (
                    <FormItem><FormLabel>Max Weight</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">CG Envelope Points</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendEnvelope({ x: 0, y: 0 })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {envelopeFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-1 text-center font-bold text-white rounded-full size-6 flex items-center justify-center" style={{backgroundColor: POINT_COLORS[index % POINT_COLORS.length]}}>{index + 1}</div>
                      <FormField control={form.control} name={`cgEnvelope.${index}.x`} render={({ field }) => (
                        <FormItem className="col-span-5"><FormControl><Input type="number" {...field} placeholder="CG (X)" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`cgEnvelope.${index}.y`} render={({ field }) => (
                        <FormItem className="col-span-5"><FormControl><Input type="number" {...field} placeholder="Weight (Y)" /></FormControl></FormItem>
                      )} />
                      <Button type="button" onClick={() => removeEnvelope(index)} variant="ghost" size="icon" className="col-span-1 text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 size={16} /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex items-center justify-between">
                <div>
                    {isEditing && (
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" type="button">Delete Profile</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the W&B profile for {initialData?.model}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className='flex gap-2'>
                    <Button variant="outline" type="button" onClick={() => router.push('/assets/mass-balance')}>Cancel</Button>
                    <Button type="submit"><Save className='mr-2' /> Save Profile</Button>
                </div>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
