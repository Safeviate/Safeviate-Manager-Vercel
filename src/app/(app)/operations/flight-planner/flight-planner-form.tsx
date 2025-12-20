
'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { calculateWindTriangle, getBearing, getDistance } from '@/lib/e6b';
import { useDebounce } from '@/hooks/use-debounce';

const waypointSchema = z.object({
    name: z.string().min(1, 'Required'),
    lat: z.number({ coerce: true }),
    lon: z.number({ coerce: true }),
});

const formSchema = z.object({
  bookingId: z.string().optional(),
  departure: z.string().min(3, "Required").max(4),
  destination: z.string().min(3, "Required").max(4),
  alternate: z.string().optional(),
  flightRules: z.enum(['VFR', 'IFR']),
  cruisingAltitude: z.number({ coerce: true }).min(0),
  waypoints: z.array(waypointSchema),
  // Performance
  cruiseSpeed: z.number({ coerce: true }).min(1, "Required"),
  windDirection: z.number({ coerce: true }).min(0).max(360),
  windSpeed: z.number({ coerce: true }).min(0),
});

type FlightPlannerFormValues = z.infer<typeof formSchema>;
type Waypoint = z.infer<typeof waypointSchema>;

interface NavLogLeg {
    from: string;
    to: string;
    track: number;
    heading: number;
    distance: number;
    groundSpeed: number;
}

interface FlightPlannerFormProps {
  aircrafts: Aircraft[];
  pilots: PilotProfile[];
  bookings: Booking[];
}

export function FlightPlannerForm({ aircrafts, pilots, bookings }: FlightPlannerFormProps) {
  
  const [navLog, setNavLog] = useState<NavLogLeg[]>([]);

  const form = useForm<FlightPlannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingId: '',
      departure: '',
      destination: '',
      alternate: '',
      flightRules: 'VFR',
      cruisingAltitude: 0,
      waypoints: [],
      cruiseSpeed: 100,
      windDirection: 0,
      windSpeed: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'waypoints'
  });

  const watchedFields = useWatch({
      control: form.control,
      name: ['waypoints', 'cruiseSpeed', 'windDirection', 'windSpeed']
  });
  const debouncedWaypoints = useDebounce(watchedFields[0], 500);
  const debouncedCruiseSpeed = useDebounce(watchedFields[1], 500);
  const debouncedWindDirection = useDebounce(watchedFields[2], 500);
  const debouncedWindSpeed = useDebounce(watchedFields[3], 500);

  useEffect(() => {
    const calculateNavLog = () => {
        if (!debouncedWaypoints || debouncedWaypoints.length < 2) {
            setNavLog([]);
            return;
        }

        const newNavLog: NavLogLeg[] = [];
        for (let i = 0; i < debouncedWaypoints.length - 1; i++) {
            const fromPoint = debouncedWaypoints[i];
            const toPoint = debouncedWaypoints[i+1];

            if (!fromPoint || !toPoint || fromPoint.lat === undefined || fromPoint.lon === undefined || toPoint.lat === undefined || toPoint.lon === undefined) continue;
            
            const distance = getDistance(fromPoint, toPoint);
            const trueCourse = getBearing(fromPoint, toPoint);

            const { heading, groundSpeed } = calculateWindTriangle({
                trueCourse,
                trueAirspeed: debouncedCruiseSpeed || 0,
                windDirection: debouncedWindDirection || 0,
                windSpeed: debouncedWindSpeed || 0
            });
            
            newNavLog.push({
                from: fromPoint.name,
                to: toPoint.name,
                track: Math.round(trueCourse),
                heading: Math.round(heading),
                distance: Math.round(distance),
                groundSpeed: Math.round(groundSpeed),
            });
        }
        setNavLog(newNavLog);
    };

    calculateNavLog();

  }, [debouncedWaypoints, debouncedCruiseSpeed, debouncedWindDirection, debouncedWindSpeed]);


  const onSubmit = (values: FlightPlannerFormValues) => {
    console.log(values);
    //
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Inputs */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Route</CardTitle>
                <CardDescription>Define the flight details and route.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bookingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Booking (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a booking..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bookings.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              #{b.bookingNumber} - {b.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="departure" render={({ field }) => (<FormItem><FormLabel>Departure</FormLabel><FormControl><Input placeholder="ICAO" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>Destination</FormLabel><FormControl><Input placeholder="ICAO" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <FormField control={form.control} name="alternate" render={({ field }) => (<FormItem><FormLabel>Alternate</FormLabel><FormControl><Input placeholder="ICAO (Optional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="flightRules" render={({ field }) => ( <FormItem><FormLabel>Flight Rules</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="VFR">VFR</SelectItem><SelectItem value="IFR">IFR</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="cruisingAltitude" render={({ field }) => (<FormItem><FormLabel>Altitude (ft)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Waypoints</CardTitle>
                    <CardDescription>Enter waypoints in order. Calculations are updated live.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                           <FormField control={form.control} name={`waypoints.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., KSQL" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`waypoints.${index}.lat`} render={({ field }) => (<FormItem><FormLabel>Lat</FormLabel><FormControl><Input type="number" step="any" placeholder="37.51" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name={`waypoints.${index}.lon`} render={({ field }) => (<FormItem><FormLabel>Lon</FormLabel><FormControl><Input type="number" step="any" placeholder="-122.25" {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full" onClick={() => append({ name: '', lat: 0, lon: 0 })}>
                        <PlusCircle className="mr-2" /> Add Waypoint
                    </Button>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance &amp; Fuel</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="cruiseSpeed" render={({ field }) => (<FormItem><FormLabel>TAS (kts)</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="windDirection" render={({ field }) => (<FormItem><FormLabel>Wind Dir (°)</FormLabel><FormControl><Input type="number" placeholder="270" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="windSpeed" render={({ field }) => (<FormItem><FormLabel>Wind Spd (kts)</FormLabel><FormControl><Input type="number" placeholder="15" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Nav Log */}
          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardHeader>
                <div className='flex justify-between items-center'>
                    <div>
                        <CardTitle>Navigation Log</CardTitle>
                        <CardDescription>Summary of your flight plan.</CardDescription>
                    </div>
                    <Button type="button" variant="outline">Print Nav Log</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Track</TableHead>
                            <TableHead>HDG</TableHead>
                            <TableHead>Dist</TableHead>
                            <TableHead>GS</TableHead>
                            <TableHead>ETE</TableHead>
                            <TableHead>Fuel</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {navLog.length > 0 ? (
                           navLog.map((leg, index) => (
                               <TableRow key={index}>
                                   <TableCell>{leg.from}</TableCell>
                                   <TableCell>{leg.to}</TableCell>
                                   <TableCell>{leg.track}°</TableCell>
                                   <TableCell>{leg.heading}°</TableCell>
                                   <TableCell>{leg.distance} NM</TableCell>
                                   <TableCell>{leg.groundSpeed} kts</TableCell>
                                   <TableCell>TODO</TableCell>
                                   <TableCell>TODO</TableCell>
                               </TableRow>
                           ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-96 text-center text-muted-foreground">
                                    Add at least two waypoints to generate the navigation log.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline">Reset Form</Button>
            <Button type="submit">Save Flight Plan</Button>
        </div>
      </form>
    </Form>
  );
}
