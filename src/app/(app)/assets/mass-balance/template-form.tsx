

'use client';

import React, { useState, useEffect } from 'react';
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
import { Trash2, Save, Plus, Maximize, RotateCcw } from 'lucide-react';
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

// --- HELPER 1: Generate "Nice" Ticks ---
const generateNiceTicks = (min: number, max: number, stepCount = 8) => {
    const start = Number(min);
    const end = Number(max);
    if (isNaN(start) || isNaN(end) || start >= end) return [];
  
    const diff = end - start;
    const roughStep = diff / (stepCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;
    
    let step;
    if (normalizedStep < 1.5) step = 1 * magnitude;
    else if (normalizedStep < 3) step = 2 * magnitude;
    else if (normalizedStep < 7) step = 5 * magnitude;
    else step = 10 * magnitude;
  
    const ticks = [];
    let current = Math.ceil(start / step) * step;
    if (current > start) ticks.push(start);
    
    while (current <= end) {
      ticks.push(current);
      current += step;
    }
    
    if (ticks[ticks.length - 1] < end && (end - ticks[ticks.length - 1]) < step * 0.1) {
      ticks.push(end);
    }
    
    return ticks;
  };

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
  emptyWeight?: number;
  emptyWeightMoment?: number;
  maxTakeoffWeight?: number;
  maxLandingWeight?: number;
  stationArms?: {
    frontSeats?: number;
    rearSeats?: number;
    fuel?: number;
    baggage1?: number;
    baggage2?: number;
  },
  stations?: Station[];
  cgEnvelope?: CgEnvelopePoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

interface TemplateFormProps {
    tenantId?: string;
    initialData?: AircraftModelProfile | null;
    mode?: 'template' | 'configurator';
}

const formSchema = z.object({
  modelName: z.string().optional(),
  xMin: z.coerce.number({invalid_type_error: "Min CG is required"}),
  xMax: z.coerce.number({invalid_type_error: "Max CG is required"}),
  yMin: z.coerce.number({invalid_type_error: "Min Weight is required"}),
  yMax: z.coerce.number({invalid_type_error: "Max Weight is required"}),
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

const defaultConfiguratorValues: FormValues = {
    modelName: "",
    stations: [],
    cgEnvelope: [],
    xMin: '' as any,
    xMax: '' as any,
    yMin: '' as any,
    yMax: '' as any,
};


const getDefaultValues = (profile?: AircraftModelProfile | null, mode?: TemplateFormProps['mode']): FormValues => {
    if (mode === 'configurator') {
        return defaultConfiguratorValues;
    }
    return {
        modelName: profile ? `${profile.make} ${profile.model}` : '',
        xMin: profile?.xMin || 0,
        xMax: profile?.xMax || 100,
        yMin: profile?.yMin || 0,
        yMax: profile?.yMax || 3000,
        stations: profile?.stations ?? [],
        cgEnvelope: profile?.cgEnvelope ?? [],
    }
};


export function MassBalanceTemplateForm({ tenantId, initialData, mode = 'template' }: TemplateFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const isEditing = !!initialData;
  const isConfiguratorMode = mode === 'configurator';
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialData, mode),
  });
  
  useEffect(() => {
    form.reset(getDefaultValues(initialData, mode));
  }, [initialData, mode, form]);

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

  const sortedEnvelope = React.useMemo(() => {
    const envelope = watchedEnvelope || [];
    if (envelope.length < 3) {
      return envelope; // Not enough points to sort
    }

    // Find the centroid of the polygon
    const centroid = envelope.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    centroid.x /= envelope.length;
    centroid.y /= envelope.length;

    // Sort points by angle from the centroid
    const sorted = [...envelope].sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });

    // Close the polygon by adding the first point to the end
    return [...sorted, sorted[0]];
  }, [watchedEnvelope]);


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


  const onSubmit = (data: FormValues) => {
    if (isConfiguratorMode || !tenantId || !firestore) return;
    
    if (!data.modelName?.trim()) {
        toast({
            variant: "destructive",
            title: "Model Name Required",
            description: "Please enter a name for the model.",
        });
        return;
    }
    
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
    if (isConfiguratorMode || !tenantId || !firestore || !isEditing || !initialData) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', initialData.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Profile Deleted', description: `The W&B profile has been deleted.` });
    router.push('/assets/mass-balance');
  };

  const handleAutoFit = () => {
    const envelope = form.getValues('cgEnvelope') || [];
    if (envelope.length < 2) {
        toast({
            variant: "destructive",
            title: "Cannot Auto-Fit",
            description: "Please add at least two envelope points.",
        });
        return;
    }
    const xValues = envelope.map(p => p.x);
    const yValues = envelope.map(p => p.y);

    const xPadding = (Math.max(...xValues) - Math.min(...xValues)) * 0.1 || 1;
    const yPadding = (Math.max(...yValues) - Math.min(...yValues)) * 0.1 || 100;
    
    form.setValue('xMin', Math.floor(Math.min(...xValues) - xPadding));
    form.setValue('xMax', Math.ceil(Math.max(...xValues) + xPadding));
    form.setValue('yMin', Math.floor(Math.min(...yValues) - yPadding));
    form.setValue('yMax', Math.ceil(Math.max(...yValues) + yPadding));
  };
  
  const handleResetConfigurator = () => {
    if (window.confirm("Are you sure you want to reset the configurator to its default state?")) {
        form.reset(defaultConfiguratorValues);
        toast({ title: "Configurator Reset", description: "The form has been reset to a blank slate." });
    }
  }

  const xAxisTicks = generateNiceTicks(watchedXMin || 0, watchedXMax || 0, 8);
  const yAxisTicks = generateNiceTicks(watchedYMin || 0, watchedYMax || 0, 8);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="order-1">
            <Card>
                <CardHeader>
                    <CardTitle>{isConfiguratorMode ? 'Interactive Graph' : (isEditing ? `W&B Graph for ${initialData?.make} ${initialData?.model}` : 'W&B Graph')}</CardTitle>
                    <CardDescription>
                        {isConfiguratorMode ? "Visualize the aircraft's center of gravity as you configure it." : 'Review the center of gravity based on the loading stations.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative flex flex-col justify-center items-center pt-6">
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }} className="text-xs">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[watchedXMin || 'dataMin', watchedXMax || 'dataMax']} allowDataOverflow={true} ticks={xAxisTicks} tickCount={8}>
                            <RechartsLabel value="Center of Gravity (inches)" offset={-25} position="insideBottom" />
                            </XAxis>
                            <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[watchedYMin || 'dataMin', watchedYMax || 'dataMax']} allowDataOverflow={true} ticks={yAxisTicks} tickCount={8}>
                                <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                            </YAxis>
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Envelope" data={sortedEnvelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} fill="transparent" shape={() => null} />
                            <Scatter name="Envelope Points" data={watchedEnvelope}>
                                {(watchedEnvelope || []).map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} />
                                ))}
                            </Scatter>
                            <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stroke="hsl(var(--primary-foreground))" strokeWidth={2}>
                                <RechartsLabel 
                                    value={`(${results.cg}, ${results.weight})`} 
                                    position="top" 
                                    fill="hsl(var(--foreground))"
                                    fontSize="12"
                                    offset={10}
                                />
                            </ReferenceDot>
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className='absolute top-4 right-4'>
                        <Badge className={cn(results.isSafe ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-sm text-white px-3 py-1')}>
                            {results.isSafe ? 'Within Limits' : 'Out of Limits'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="order-2">
            <Card>
                <CardHeader>
                <CardTitle>{isConfiguratorMode ? 'Configurator' : (isEditing ? `Edit ${initialData?.make} ${initialData?.model}` : 'Create New W&B Profile')}</CardTitle>
                <CardDescription>{isConfiguratorMode ? 'Interactively build and test a new template from scratch.' : 'Define the weight and balance parameters for an aircraft model.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!isConfiguratorMode && (
                        <FormField control={form.control} name="modelName" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Model Name</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Cessna 172S" /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    {isConfiguratorMode && (
                        <FormField control={form.control} name="modelName" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Template Name (For Testing)</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Cessna 172S" /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    )}


                    {!isConfiguratorMode && <Separator />}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                            <h3 className="text-md font-medium">Loading Stations</h3>
                            <Button type="button" size="sm" variant="outline" onClick={() => appendStation({ id: Date.now(), name: '', weight: 0, arm: 0 })}>
                                <Plus className="mr-2 h-4 w-4" /> Add
                            </Button>
                            </div>
                            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-1 mb-2">
                                <div className="col-span-5">Station Name</div>
                                <div className="col-span-3">Weight</div>
                                <div className="col-span-3">Arm</div>
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
                      </div>

                      <div className="space-y-6">
                        <div>
                            <h3 className="text-md font-medium mb-2">Chart Axis Limits</h3>
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
                            <Button onClick={handleAutoFit} type="button" variant="outline" size="sm" className="w-full mt-4">
                            <Maximize className="mr-2 h-4 w-4"/> Auto-Fit Axes
                            </Button>
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-medium">CG Envelope Points</h3>
                                <Button type="button" size="sm" variant="outline" onClick={() => appendEnvelope({ x: 0, y: 0 })}>
                                    <Plus className="mr-2 h-4 w-4" /> Add
                                </Button>
                            </div>
                             <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-1 mb-2">
                                <div className="col-span-1"></div>
                                <div className="col-span-5">CG (X)</div>
                                <div className="col-span-5">Weight (Y)</div>
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
                      </div>
                    </div>
                </CardContent>
                {!isConfiguratorMode ? (
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
                                                This action cannot be undone. This will permanently delete the W&amp;B profile for {initialData?.model}.
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
                ) : (
                    <CardFooter className="border-t pt-4 flex items-center justify-end">
                        <Button variant="outline" type="button" onClick={handleResetConfigurator}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
      </form>
    </Form>
  );
}
