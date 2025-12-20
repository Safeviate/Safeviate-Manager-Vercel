
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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

const formSchema = z.object({
  bookingId: z.string().optional(),
  departure: z.string().min(3, "Required").max(4),
  destination: z.string().min(3, "Required").max(4),
  alternate: z.string().optional(),
  flightRules: z.enum(['VFR', 'IFR']),
  cruisingAltitude: z.number({ coerce: true }).min(0),
});

type FlightPlannerFormValues = z.infer<typeof formSchema>;

interface FlightPlannerFormProps {
  aircrafts: Aircraft[];
  pilots: PilotProfile[];
  bookings: Booking[];
}

export function FlightPlannerForm({ aircrafts, pilots, bookings }: FlightPlannerFormProps) {
  
  const form = useForm<FlightPlannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flightRules: 'VFR',
    },
  });

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
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Waypoint list placeholder */}
                    <div className='flex items-center justify-center h-24 border-2 border-dashed rounded-md text-muted-foreground'>
                        <p>Waypoint input coming soon</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weight & Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* W&B form placeholder */}
                <div className='flex items-center justify-center h-24 border-2 border-dashed rounded-md text-muted-foreground'>
                    <p>W&B inputs coming soon</p>
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>Performance & Fuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance form placeholder */}
                <div className='flex items-center justify-center h-24 border-2 border-dashed rounded-md text-muted-foreground'>
                    <p>Performance inputs coming soon</p>
                </div>
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
                            <TableHead>Waypoint</TableHead>
                            <TableHead>Track</TableHead>
                            <TableHead>Heading</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead>GS</TableHead>
                            <TableHead>ETE</TableHead>
                            <TableHead>Fuel</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={7} className="h-96 text-center text-muted-foreground">
                                Complete the form to generate the navigation log.
                            </TableCell>
                        </TableRow>
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
