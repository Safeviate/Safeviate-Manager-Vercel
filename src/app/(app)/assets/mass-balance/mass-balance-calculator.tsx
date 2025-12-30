
'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { PlusCircle, Trash2, Scale } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { MassBalanceChart } from './mass-balance-chart';

const stationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['weight', 'fuel']),
  weight: z.number({ coerce: true }).min(0, 'Must be positive').optional(),
  gallons: z.number({ coerce: true }).min(0, 'Must be positive').optional(),
  arm: z.number(),
  moment: z.number().optional(),
});

const formSchema = z.object({
  stations: z.array(stationSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface MassBalanceCalculatorProps {
  aircraftProfile: AircraftModelProfile;
  onSave: (profile: AircraftModelProfile) => void;
}

export function MassBalanceCalculator({ aircraftProfile, onSave }: MassBalanceCalculatorProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stations: aircraftProfile.stations,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'stations',
  });

  const watchedStations = useWatch({
    control: form.control,
    name: 'stations',
  });

  const calculatedValues = useMemo(() => {
    let currentTotalWeight = 0;
    let currentTotalMoment = 0;

    const updatedStations = watchedStations.map(station => {
      const weight = station.type === 'fuel' 
        ? (station.gallons || 0) * FUEL_WEIGHT_PER_GALLON 
        : station.weight || 0;
      const moment = weight * station.arm;
      currentTotalWeight += weight;
      currentTotalMoment += moment;
      return { ...station, moment, calculatedWeight: weight };
    });

    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    
    return {
      updatedStations,
      totalWeight: currentTotalWeight,
      totalMoment: currentTotalMoment,
      centerOfGravity: cg,
    };
  }, [watchedStations]);

  const { totalWeight, totalMoment, centerOfGravity } = calculatedValues;

  const handleReset = () => {
    form.reset({ stations: aircraftProfile.stations });
    toast({
      title: 'Form Reset',
      description: 'All values have been reset to the template defaults.',
    });
  };

  const handleSaveTemplate = () => {
    const currentStations = form.getValues('stations');
    onSave({ ...aircraftProfile, stations: currentStations });
  }

  return (
    <Form {...form}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Loading Stations</CardTitle>
                    <CardDescription>
                    Manage the weights and fuel for each station on the aircraft.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-4 items-center gap-4 p-4 border rounded-lg">
                        <div className="col-span-2">
                            <FormLabel>{field.name}</FormLabel>
                        </div>
                        {field.type === 'weight' ? (
                            <FormField
                                control={form.control}
                                name={`stations.${index}.weight`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Weight (lbs)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name={`stations.${index}.gallons`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fuel (gal)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                        )}
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full" onClick={() => append({ id: Date.now(), name: 'New Station', arm: 0, weight: 0, type: 'weight' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Station
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>CG Envelope</CardTitle>
                    <CardDescription>The calculated Center of Gravity is plotted against the aircraft&apos;s envelope.</CardDescription>
                </CardHeader>
                <CardContent>
                    <MassBalanceChart
                        aircraftProfile={aircraftProfile}
                        calculatedCg={{ x: centerOfGravity, y: totalWeight }}
                    />
                </CardContent>
            </Card>

        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="font-bold text-lg">{totalWeight.toFixed(2)} lbs</span>
              </div>
               <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total Moment:</span>
                <span className="font-bold text-lg">{totalMoment.toFixed(2)} lbs-in</span>
              </div>
               <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Center of Gravity:</span>
                <span className="font-bold text-lg">{centerOfGravity.toFixed(2)} in</span>
              </div>
            </CardContent>
             <CardFooter>
                 <p className="text-xs text-muted-foreground">Max Takeoff Weight: {aircraftProfile.maxTakeoffWeight ? `${aircraftProfile.maxTakeoffWeight} lbs` : 'N/A'}</p>
             </CardFooter>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
            </CardHeader>
             <CardContent>
                <p className="text-sm text-muted-foreground">
                    Save the current weights as a new template or reset to the original values.
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleReset}>Save</Button>
                <Button type="button" onClick={handleSaveTemplate}>Save as Template</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Form>
  );
}
