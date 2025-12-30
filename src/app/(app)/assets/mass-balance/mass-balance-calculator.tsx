
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { AircraftModelProfile, Station } from '@/types/aircraft';
import { MassBalanceChart } from './mass-balance-chart';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

const stationSchema = z.object({
  id: z.number(),
  name: z.string(),
  weight: z.number({ coerce: true }).min(0, "Must be positive"),
  arm: z.number({ coerce: true }),
  type: z.enum(['weight', 'fuel']),
  gallons: z.number({ coerce: true }).optional(),
  maxGallons: z.number().optional(),
});

const formSchema = z.object({
  stations: z.array(stationSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface MassBalanceCalculatorProps {
  aircraftProfile: AircraftModelProfile;
}

export function MassBalanceCalculator({ aircraftProfile }: MassBalanceCalculatorProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stations: aircraftProfile.stations || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'stations',
  });

  const watchedStations = form.watch('stations');

  const { totalWeight, totalMoment, isCGInEnvelope, isWeightOk, cg } = useMemo(() => {
    let currentTotalWeight = 0;
    let currentTotalMoment = 0;

    watchedStations.forEach(station => {
      currentTotalWeight += station.weight || 0;
      currentTotalMoment += (station.weight || 0) * (station.arm || 0);
    });
    
    const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]) => {
        if (!polygon || polygon.length === 0) return false;
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) isInside = !isInside;
        }
        return isInside;
    };

    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    const isCGInEnvelope = isPointInPolygon({ x: cg, y: currentTotalWeight }, aircraftProfile.cgEnvelope || []);
    const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);

    return {
      totalWeight: currentTotalWeight,
      totalMoment: currentTotalMoment,
      isCGInEnvelope,
      isWeightOk,
      cg
    };
  }, [watchedStations, aircraftProfile]);

  const handleGallonsChange = (index: number, gallons: number) => {
    const station = form.getValues(`stations.${index}`);
    if (station && station.type === 'fuel') {
      const weight = gallons * FUEL_WEIGHT_PER_GALLON;
      form.setValue(`stations.${index}.weight`, parseFloat(weight.toFixed(2)));
      form.setValue(`stations.${index}.gallons`, gallons);
    }
  };

  const handleReset = () => {
    form.reset({ stations: aircraftProfile.stations || [] });
    toast({ title: 'Calculator Reset', description: 'All weights and fuel have been reset to the template default.' });
  };
  
  const onSubmit = (values: FormValues) => {
    // This form doesn't "submit" in a traditional sense. 
    // It's used for live calculations. The save action is separate.
    console.log("Form values (for debugging):", values);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading Stations</CardTitle>
                <CardDescription>Enter weights and fuel amounts for this flight.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-5 items-center gap-4 p-3 border rounded-lg">
                    <p className="col-span-2 font-medium">{field.name}</p>
                    {field.type === 'fuel' ? (
                        <>
                            <FormField
                                control={form.control}
                                name={`stations.${index}.gallons`}
                                render={({ field: gallonField }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Gallons"
                                                {...gallonField}
                                                onChange={(e) => handleGallonsChange(index, parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-sm text-muted-foreground">gal</span>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    readOnly
                                    value={watchedStations[index]?.weight || 0}
                                    className="bg-muted"
                                />
                                <span className="text-sm text-muted-foreground">lbs</span>
                            </div>
                        </>
                    ) : (
                         <div className="col-span-2 flex items-center gap-2">
                            <FormField
                                control={form.control}
                                name={`stations.${index}.weight`}
                                render={({ field: weightField }) => (
                                    <FormItem className="flex-1">
                                        <Input
                                            type="number"
                                            placeholder="Weight"
                                            {...weightField}
                                        />
                                    </FormItem>
                                )}
                            />
                            <span className="text-sm text-muted-foreground">lbs</span>
                        </div>
                    )}
                     <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            readOnly
                            value={((watchedStations[index]?.weight || 0) * (watchedStations[index]?.arm || 0)).toFixed(0)}
                            className="bg-muted"
                        />
                        <span className="text-sm text-muted-foreground">moment</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="font-medium">Total Weight</span>
                  <span className={`font-bold ${!isWeightOk ? 'text-destructive' : ''}`}>{totalWeight.toFixed(2)} lbs</span>
              </div>
               <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="font-medium">Total Moment</span>
                  <span className="font-bold">{totalMoment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                  <span className="font-medium">Center of Gravity</span>
                  <span className={`font-bold ${!isCGInEnvelope ? 'text-destructive' : ''}`}>{cg.toFixed(2)}</span>
              </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>CG Envelope</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
                <MassBalanceChart 
                    envelope={aircraftProfile.cgEnvelope || []}
                    currentCG={cg}
                    currentWeight={totalWeight}
                    xMin={aircraftProfile.xMin}
                    xMax={aircraftProfile.xMax}
                    yMin={aircraftProfile.yMin}
                    yMax={aircraftProfile.yMax}
                />
            </CardContent>
        </Card>
         <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleReset}>Save</Button>
            <Button type="submit" form="template-form">Save as Template</Button>
          </div>
      </div>
    </div>
  );
}
