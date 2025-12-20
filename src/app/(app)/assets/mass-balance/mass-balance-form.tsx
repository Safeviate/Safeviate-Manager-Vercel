'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '../new/page';
import type { Booking } from '@/types/booking';
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  Area,
} from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  arm: z.number(),
  weight: z.number().min(0).optional(),
  maxGallons: z.number().optional(),
});

const formSchema = z.object({
  stations: z.array(stationSchema),
  emptyWeight: z.number(),
  emptyWeightMoment: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface MassAndBalanceFormProps {
  aircrafts: Aircraft[];
  profiles: AircraftModelProfile[];
  booking?: Booking | null;
  tenantId: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border p-2 rounded-md shadow-md">
        <p className="font-bold">{`${payload[0].payload.name}`}</p>
        <p>{`Weight: ${payload[0].value.toLocaleString()} lbs`}</p>
        <p>{`CG: ${payload[1].value.toFixed(2)} in`}</p>
      </div>
    );
  }
  return null;
};

export function MassAndBalanceForm({ aircrafts, profiles, booking, tenantId }: MassAndBalanceFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    booking?.aircraftId || null
  );

  const [cgPoints, setCgPoints] = useState<any[]>([]);
  const [isWithinLimits, setIsWithinLimits] = useState<boolean | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stations: [],
      emptyWeight: 0,
      emptyWeightMoment: 0,
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'stations',
  });
  
  const stationValues = form.watch('stations');
  const emptyWeight = form.watch('emptyWeight');
  const emptyWeightMoment = form.watch('emptyWeightMoment');

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const selectedAircraft = useMemo(
    () => aircrafts.find((a) => a.id === selectedAircraftId),
    [aircrafts, selectedAircraftId]
  );
  
  useEffect(() => {
    if (booking && aircrafts.length > 0) {
        setSelectedAircraftId(booking.aircraftId);
    }
  }, [booking, aircrafts]);

  useEffect(() => {
    let profileToLoad: AircraftModelProfile | Aircraft | undefined;
    if (selectedProfileId) {
      profileToLoad = profiles.find((p) => p.id === selectedProfileId);
    } else if (selectedAircraftId) {
      profileToLoad = aircrafts.find((a) => a.id === selectedAircraftId);
    }

    if (profileToLoad) {
      form.setValue('emptyWeight', profileToLoad.emptyWeight || 0);
      form.setValue('emptyWeightMoment', profileToLoad.emptyWeightMoment || 0);

      const profileStations =
        profileToLoad.stations?.map((s) => ({
          id: s.id.toString(),
          name: s.name,
          type: s.type,
          arm: s.arm,
          weight: s.weight,
          maxGallons: s.maxGallons,
        })) || [];
      replace(profileStations);
    } else {
       // Clear form if no profile or aircraft is selected
        form.reset({
            stations: [],
            emptyWeight: 0,
            emptyWeightMoment: 0,
        });
    }
  }, [selectedProfileId, selectedAircraftId, profiles, aircrafts, form, replace]);

  useEffect(() => {
    if (booking?.massAndBalance?.stationWeights) {
      const newStations = stationValues.map(station => {
        const savedWeight = booking.massAndBalance?.stationWeights[station.id];
        return {
          ...station,
          weight: savedWeight !== undefined ? savedWeight : station.weight,
        };
      });
      form.setValue('stations', newStations);
    }
  }, [booking?.massAndBalance, selectedAircraftId, selectedProfileId]); // Rerun when profile changes


  const totals = useMemo(() => {
    const momentValues = stationValues.map(
      (s) => (s.weight || 0) * s.arm
    );
    const totalWeight =
      emptyWeight + stationValues.reduce((acc, s) => acc + (s.weight || 0), 0);
    const totalMoment =
      emptyWeightMoment + momentValues.reduce((acc, m) => acc + m, 0);
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    return { totalWeight, totalMoment, centerOfGravity };
  }, [stationValues, emptyWeight, emptyWeightMoment]);

  const handleCalculate = () => {
    const newPoints = [
      { name: 'Zero Fuel', weight: totals.totalWeight, cg: totals.centerOfGravity },
    ];
    setCgPoints(newPoints);
    
    const envelope = selectedProfile?.cgEnvelope || selectedAircraft?.cgEnvelope || [];
    const point = { y: totals.totalWeight, x: totals.centerOfGravity };
    const inLimits = isPointInPolygon(point, envelope);
    setIsWithinLimits(inLimits);
  };
  
  const handleSaveToBooking = () => {
    if (!booking || !firestore || !selectedAircraftId) {
        toast({ variant: "destructive", title: "Error", description: "No booking or aircraft selected." });
        return;
    }
    
    const massAndBalanceData = {
        stationWeights: stationValues.reduce((acc, station) => {
            acc[station.id] = station.weight || 0;
            return acc;
        }, {} as Record<string, number>),
        totalWeight: totals.totalWeight,
        totalMoment: totals.totalMoment,
        centerOfGravity: totals.centerOfGravity,
        isWithinLimits: isWithinLimits ?? false,
        calculatedAt: new Date().toISOString(),
    };
    
    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
    updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
    
    toast({ title: "Saved", description: "Mass & Balance data has been saved to the booking." });
  };
  
  const currentEnvelope = selectedProfile?.cgEnvelope || selectedAircraft?.cgEnvelope;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mass & Balance Calculator</CardTitle>
        <CardDescription>
          Load an aircraft or profile, enter weights, and calculate the center
          of gravity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* --- Left Column: Chart --- */}
            <div className="h-96 w-full p-4 border rounded-lg">
              <ResponsiveContainer>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="cg"
                    label={{
                      value: 'Center of Gravity (in)',
                      position: 'insideBottom',
                      offset: -10,
                    }}
                    domain={[currentEnvelope?.[0].x * 0.95, currentEnvelope?.[2].x * 1.05]}
                    tickCount={8}
                    tickFormatter={(val) => val.toFixed(1)}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="weight"
                    label={{
                      value: 'Weight (lbs)',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                    domain={[currentEnvelope?.[0].y * 0.9, currentEnvelope?.[3].y * 1.1]}
                    tickCount={10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                  {currentEnvelope && (
                    <Area
                      type="linear"
                      dataKey="y"
                      data={currentEnvelope}
                      stroke="hsl(var(--foreground))"
                      fill="hsl(var(--primary) / 0.2)"
                      isAnimationActive={false}
                    />
                  )}

                  <Scatter name="CG Points" data={cgPoints} fill="hsl(var(--destructive))" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* --- Right Column: Form --- */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  onValueChange={(id) => {
                    setSelectedProfileId(id);
                    setSelectedAircraftId(null);
                  }}
                  value={selectedProfileId || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load Saved Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.profileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(id) => {
                    setSelectedAircraftId(id);
                    setSelectedProfileId(null);
                  }}
                  value={selectedAircraftId || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load from Aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    {aircrafts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.tailNumber} ({a.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">Weight (lbs)</TableHead>
                      <TableHead className="text-right">Arm (in)</TableHead>
                      <TableHead className="text-right">Moment (lb-in)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Basic Empty Weight</TableCell>
                      <TableCell className="text-right">
                        {emptyWeight.toLocaleString()}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {emptyWeightMoment.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <p>{field.name}</p>
                          {field.type === 'fuel' && (
                             <Controller
                                control={form.control}
                                name={`stations.${index}.weight`}
                                render={({ field: { onChange, ...props } }) => (
                                    <div className='flex items-center gap-2 mt-1'>
                                        <Input
                                            type="number"
                                            className='h-8 w-24'
                                            placeholder='Gallons'
                                            onChange={(e) => {
                                                const gallons = parseFloat(e.target.value);
                                                const weight = isNaN(gallons) ? 0 : gallons * FUEL_WEIGHT_PER_GALLON;
                                                onChange(weight);
                                            }}
                                            // Calculate gallons from weight for display
                                            value={props.value ? (props.value / FUEL_WEIGHT_PER_GALLON).toFixed(1) : ''}
                                        />
                                        <span className='text-xs text-muted-foreground'>
                                            / {field.maxGallons} gal
                                        </span>
                                    </div>
                                )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                           {field.type !== 'fuel' && (
                             <Controller
                                control={form.control}
                                name={`stations.${index}.weight`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="h-8 text-right"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                )}
                              />
                           )}
                           {field.type === 'fuel' && (
                                <p>{(stationValues[index]?.weight || 0).toFixed(1)}</p>
                           )}
                        </TableCell>
                        <TableCell className="text-right">{field.arm}</TableCell>
                        <TableCell className="text-right">
                          {((stationValues[index]?.weight || 0) * field.arm).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right font-bold">
                        {totals.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                         {totals.centerOfGravity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {totals.totalMoment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
                {isWithinLimits !== null && (
                    <div className={`p-4 rounded-md text-center font-bold ${isWithinLimits ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isWithinLimits ? 'Center of Gravity is WITHIN limits.' : 'Center of Gravity is OUTSIDE limits.'}
                    </div>
                )}
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={handleCalculate} disabled={!selectedProfileId && !selectedAircraftId}>Calculate</Button>
                {booking && (
                    <Button type="button" onClick={handleSaveToBooking} variant="outline" disabled={cgPoints.length === 0}>
                        Save to Booking
                    </Button>
                )}
              </div>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
