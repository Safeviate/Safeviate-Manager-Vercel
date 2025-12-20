
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Label } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, setDoc, updateDoc } from 'firebase/firestore';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '@/types/mass-and-balance';
import type { Booking } from '@/types/booking';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { PlusCircle, Trash2, RotateCcw } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['weight', 'fuel', 'moment']),
  weight: z.number().optional(),
  arm: z.number().optional(),
  gallons: z.number().optional(),
  maxGallons: z.number().optional(),
});

const formSchema = z.object({
  profileName: z.string().min(1, 'Profile name is required'),
  emptyWeight: z.number().min(0, 'Empty weight must be positive'),
  emptyWeightMoment: z.number().min(0, 'Moment must be positive'),
  maxTakeoffWeight: z.number().min(0, 'Max takeoff weight must be positive'),
  stations: z.array(stationSchema),
  cgEnvelope: z.array(z.object({ x: z.number(), y: z.number() })),
  xMin: z.number(),
  xMax: z.number(),
  yMin: z.number(),
  yMax: z.number(),
});

type FormValues = z.infer<typeof formSchema>;
type Station = z.infer<typeof stationSchema>;

export default function MassBalanceForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get('bookingId');
  const aircraftId = searchParams.get('aircraftId');
  
  const tenantId = 'safeviate'; // Hardcoded for now
  
  const [loadedProfile, setLoadedProfile] = useState<AircraftModelProfile | null>(null);
  
  // Data fetching
  const profilesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/massAndBalance`)) : null, [firestore, tenantId]);
  const aircraftQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null, [firestore, tenantId]);
  const bookingRef = useMemoFirebase(() => firestore && bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, bookingId) : null, [firestore, tenantId, bookingId]);

  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  const isLoading = isLoadingProfiles || isLoadingAircrafts || (bookingId ? isLoadingBooking : false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profileName: '',
      emptyWeight: 0,
      emptyWeightMoment: 0,
      maxTakeoffWeight: 0,
      stations: [],
      cgEnvelope: [],
      xMin: 0, xMax: 100, yMin: 0, yMax: 3000
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'stations',
  });

  const stations = form.watch('stations');
  const emptyWeight = form.watch('emptyWeight');
  const emptyWeightMoment = form.watch('emptyWeightMoment');

  useEffect(() => {
    if (booking?.massAndBalance?.stationWeights) {
      const stationWeights = booking.massAndBalance.stationWeights;
      const updatedStations = form.getValues('stations').map(station => {
        if (station.id in stationWeights) {
          if (station.type === 'fuel') {
            return { ...station, gallons: stationWeights[station.id] };
          }
          return { ...station, weight: stationWeights[station.id] };
        }
        return station;
      });
      form.setValue('stations', updatedStations);
    }
  }, [booking, form.formState.isSubmitSuccessful]); // Reload on successful load from booking

  const calculation = useMemo(() => {
    let totalWeight = emptyWeight;
    let totalMoment = emptyWeightMoment;

    stations.forEach((station) => {
      let stationWeight = 0;
      if (station.type === 'fuel' && station.gallons) {
        stationWeight = station.gallons * FUEL_WEIGHT_PER_GALLON;
      } else if (station.weight) {
        stationWeight = station.weight;
      }
      
      totalWeight += stationWeight;
      if (station.arm) {
        totalMoment += stationWeight * station.arm;
      } else if (station.type === 'moment' && station.weight) {
        totalMoment += station.weight; // For moment-based items
      }
    });

    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    const isWithinEnvelope = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, form.getValues('cgEnvelope'));
    const isUnderMaxWeight = totalWeight <= form.getValues('maxTakeoffWeight');

    return {
      totalWeight: isNaN(totalWeight) ? 0 : totalWeight,
      totalMoment: isNaN(totalMoment) ? 0 : totalMoment,
      centerOfGravity: isNaN(centerOfGravity) ? 0 : centerOfGravity,
      isWithinLimits: isWithinEnvelope && isUnderMaxWeight
    };
  }, [stations, emptyWeight, emptyWeightMoment, form]);


  const loadProfile = (profileId: string, source: 'profile' | 'aircraft') => {
    let profileData: AircraftModelProfile | Aircraft | undefined;
    
    if (source === 'profile') {
      profileData = profiles?.find(p => p.id === profileId);
    } else { // aircraft
      profileData = aircrafts?.find(a => a.id === profileId);
    }

    if (profileData) {
      form.reset({
        profileName: 'profileName' in profileData ? profileData.profileName : `Aircraft: ${profileData.tailNumber}`,
        emptyWeight: profileData.emptyWeight || 0,
        emptyWeightMoment: profileData.emptyWeightMoment || 0,
        maxTakeoffWeight: profileData.maxTakeoffWeight || 0,
        stations: ('stations' in profileData && profileData.stations) ? profileData.stations.map(s => ({...s, id: s.id.toString()})) : [],
        cgEnvelope: profileData.cgEnvelope || [],
        xMin: ('xMin' in profileData && profileData.xMin) ? profileData.xMin : 0,
        xMax: ('xMax' in profileData && profileData.xMax) ? profileData.xMax : 100,
        yMin: ('yMin' in profileData && profileData.yMin) ? profileData.yMin : 0,
        yMax: ('yMax' in profileData && profileData.yMax) ? profileData.yMax : 3000,
      });
      setLoadedProfile(profileData as AircraftModelProfile); // cast for now
      toast({ title: "Profile Loaded", description: `Loaded data for ${'profileName' in profileData ? profileData.profileName : profileData.tailNumber}` });
    }
  };

  const handleSaveToBooking = async () => {
    if (!firestore || !bookingId || !bookingRef) return;

    const stationWeights: { [stationId: string]: number } = {};
    stations.forEach(s => {
        stationWeights[s.id] = s.type === 'fuel' ? (s.gallons || 0) : (s.weight || 0);
    });

    const massAndBalanceData = {
        stationWeights,
        totalWeight: calculation.totalWeight,
        totalMoment: calculation.totalMoment,
        centerOfGravity: calculation.centerOfGravity,
        isWithinLimits: calculation.isWithinLimits,
        calculatedAt: new Date().toISOString()
    };
    
    try {
        await updateDoc(bookingRef, { massAndBalance: massAndBalanceData });
        toast({ title: 'Saved to Booking', description: 'Mass & Balance data has been attached to the booking.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  const handleStationTypeChange = (index: number, newType: 'weight' | 'fuel' | 'moment') => {
    const currentStation = fields[index];
    update(index, { ...currentStation, type: newType, weight: 0, gallons: 0 });
  };
  
  const formattedDataForChart = [
    { name: 'Empty', weight: emptyWeight, cg: emptyWeight > 0 ? emptyWeightMoment / emptyWeight : 0 },
    ...stations.map(s => {
      const stationWeight = s.type === 'fuel' ? (s.gallons || 0) * FUEL_WEIGHT_PER_GALLON : (s.weight || 0);
      return {
        name: s.name,
        weight: stationWeight,
        cg: s.arm,
      };
    }),
    { name: 'Total', weight: calculation.totalWeight, cg: calculation.centerOfGravity, isTotal: true }
  ];

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-[400px] w-full' />
        <Skeleton className='h-[300px] w-full' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
        <Card className="shadow-lg">
            <CardContent className='p-2 md:p-4'>
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                    data={form.getValues('cgEnvelope')}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="CG (inches)" 
                        domain={[form.getValues('xMin'), form.getValues('xMax')]}
                        tickCount={10}
                        allowDataOverflow
                    >
                         <Label value="CG (inches)" offset={0} position="insideBottom" dy={25} />
                    </XAxis>
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Weight (lbs)" 
                        domain={[form.getValues('yMin'), form.getValues('yMax')]}
                        tickCount={10}
                        allowDataOverflow
                    />
                    <Tooltip 
                      formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="y" 
                        stroke="hsl(var(--foreground))" 
                        fill="hsl(var(--primary) / 0.2)" 
                        name="CG Envelope" 
                        isAnimationActive={false}
                    />
                     <ReferenceLine
                        segment={[{ x: calculation.centerOfGravity, y: 0 }, { x: calculation.centerOfGravity, y: calculation.totalWeight }]}
                        stroke={calculation.isWithinLimits ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                    />
                     <ReferenceLine
                        segment={[{ x: form.getValues('xMin'), y: calculation.totalWeight }, { x: calculation.centerOfGravity, y: calculation.totalWeight }]}
                        stroke={calculation.isWithinLimits ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                    />
                </AreaChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>

        <Form {...form}>
            <form className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Mass & Balance Configurator</CardTitle>
                        <CardDescription>
                            Load a profile or manually enter data. All changes are reflected in real-time on the graph above.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <div className='p-4 border-l-4 border-destructive bg-destructive/10'>
                           <p className='font-bold text-destructive-foreground'>WARNING: FOR TRAINING & DEMONSTRATION PURPOSES ONLY. CONSULT AIRCRAFT POH BEFORE FLIGHT.</p>
                       </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select onValueChange={(id) => loadProfile(id, 'profile')}>
                                <SelectTrigger><SelectValue placeholder="Load Saved Profile" /></SelectTrigger>
                                <SelectContent>
                                    {profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <Select onValueChange={(id) => loadProfile(id, 'aircraft')}>
                                <SelectTrigger><SelectValue placeholder="Load from Aircraft Registration" /></SelectTrigger>
                                <SelectContent>
                                    {aircrafts?.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         {bookingId && booking && !booking.massAndBalance && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Booking In Progress</AlertTitle>
                                <AlertDescription>
                                    This calculation is for Booking #{booking.bookingNumber}. Save your results to attach them to the booking record.
                                </AlertDescription>
                            </Alert>
                        )}
                         {bookingId && booking && booking.massAndBalance && (
                            <Alert variant='default'>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Calculation Loaded from Booking</AlertTitle>
                                <AlertDescription>
                                   You are viewing a previously saved calculation for Booking #{booking.bookingNumber}. Any new changes will overwrite the saved data.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
                            <FormField control={form.control} name="emptyWeight" render={({ field }) => (<FormItem><FormLabel>Empty Weight (lbs)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="emptyWeightMoment" render={({ field }) => (<FormItem><FormLabel>Empty Weight Moment</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="maxTakeoffWeight" render={({ field }) => (<FormItem><FormLabel>Max Takeoff Weight</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>)} />
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className='text-lg font-medium'>Loading Stations</h3>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border p-4 rounded-lg relative">
                                    <FormItem className='md:col-span-3'>
                                        <FormLabel>Station Name</FormLabel>
                                        <FormControl><Input {...form.register(`stations.${index}.name`)} /></FormControl>
                                    </FormItem>
                                    <FormItem className='md:col-span-2'>
                                        <FormLabel>Type</FormLabel>
                                         <Select value={field.type} onValueChange={(value: 'weight' | 'fuel' | 'moment') => handleStationTypeChange(index, value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="weight">Weight</SelectItem>
                                                <SelectItem value="fuel">Fuel</SelectItem>
                                                <SelectItem value="moment">Moment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                     {field.type === 'fuel' ? (
                                        <>
                                        <FormItem className='md:col-span-2'><FormLabel>Gallons</FormLabel><FormControl><Input type="number" placeholder="Gallons" {...form.register(`stations.${index}.gallons`, { valueAsNumber: true })} /></FormControl></FormItem>
                                        <FormItem className='md:col-span-2'><FormLabel>Max Gallons</FormLabel><FormControl><Input type="number" placeholder="Max" {...form.register(`stations.${index}.maxGallons`, { valueAsNumber: true })} /></FormControl></FormItem>
                                        </>
                                     ) : (
                                        <FormItem className='md:col-span-4'><FormLabel>Weight (lbs)</FormLabel><FormControl><Input type="number" placeholder="Weight" {...form.register(`stations.${index}.weight`, { valueAsNumber: true })} /></FormControl></FormItem>
                                     )}
                                    <FormItem className='md:col-span-2'>
                                        <FormLabel>Arm (inches)</FormLabel>
                                        <FormControl><Input type="number" {...form.register(`stations.${index}.arm`, { valueAsNumber: true })} disabled={field.type === 'moment'} /></FormControl>
                                    </FormItem>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className='md:col-span-1 place-self-center'><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" onClick={() => append({ id: (fields.length + 1).toString(), name: `Station ${fields.length + 1}`, type: 'weight' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Station</Button>
                        </div>

                    </CardContent>
                    <CardFooter className='flex-col items-stretch gap-4 md:flex-row justify-between border-t pt-6'>
                       <div className={`p-4 rounded-lg flex-1 font-mono text-center text-lg ${calculation.isWithinLimits ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {calculation.isWithinLimits ? "Within Limits" : "OUT OF LIMITS"}
                        </div>
                       <div className="flex flex-col md:flex-row gap-2">
                           <Button type="button" variant="secondary" onClick={() => router.push('/assets/mass-balance-profiles')}>Manage Profiles</Button>
                            {bookingId && <Button type="button" onClick={handleSaveToBooking}>Save to Booking</Button>}
                       </div>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    </div>
  );
}
