
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { ReportType } from '@/types/safety-report';

const formSchema = z.object({
  reportType: z.string().min(1, "Report type is required."),
  isAnonymous: z.boolean().default(false),
  eventDate: z.date({ required_error: "Event date is required." }),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:mm)." }),
  location: z.string().min(1, "Location is required."),
  aircraftId: z.string().optional(),
  description: z.string().min(10, "Please provide a detailed description."),
  // Conditional fields
  phaseOfFlight: z.string().optional(),
  systemOrComponent: z.string().optional(),
});

export type NewSafetyReportValues = z.infer<typeof formSchema>;

interface NewSafetyReportFormProps {
  aircrafts: Aircraft[];
  onSubmit: (values: NewSafetyReportValues) => Promise<void>;
  isSubmitting: boolean;
}

export function NewSafetyReportForm({ aircrafts, onSubmit, isSubmitting }: NewSafetyReportFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<NewSafetyReportValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportType: '',
      isAnonymous: false,
      eventTime: format(new Date(), 'HH:mm'),
      location: '',
      aircraftId: '',
      description: '',
      phaseOfFlight: '',
      systemOrComponent: '',
    },
  });

  const selectedReportType = form.watch('reportType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>File New Safety Report</CardTitle>
            <CardDescription>
              Your vigilance helps maintain our high safety standards. Please provide as much detail as possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="reportType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type of Report</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Flight Operations, Aircraft Defect" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                        <FormItem className="flex flex-col rounded-lg border p-3 justify-center">
                            <FormLabel>File Anonymously</FormLabel>
                            <div className="flex items-center space-x-2 pt-2">
                               <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                                <span className="text-sm text-muted-foreground">
                                    {field.value ? "Your identity will be hidden." : "Your name will be attached."}
                                </span>
                            </div>
                        </FormItem>
                    )}
                />
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Date of Event</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <CustomCalendar
                                    selectedDate={field.value}
                                    onDateSelect={field.onChange}
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="eventTime" render={({ field }) => (<FormItem><FormLabel>Time of Event (24h)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Apron Bravo, near Hangar 3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>
            
            {selectedReportType && <Separator />}

            {selectedReportType === 'Flight Operations' && (
                <FormField control={form.control} name="phaseOfFlight" render={({ field }) => (<FormItem><FormLabel>Phase of Flight</FormLabel><FormControl><Input placeholder="e.g., Take-off, Cruise, Landing" {...field} /></FormControl><FormMessage /></FormItem>)} />
            )}
            
            {selectedReportType === 'Aircraft Defect' && (
                 <FormField control={form.control} name="systemOrComponent" render={({ field }) => (<FormItem><FormLabel>System or Component</FormLabel><FormControl><Input placeholder="e.g., Left main landing gear, PFD unit 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            )}

            {(selectedReportType === 'Flight Operations' || selectedReportType === 'Aircraft Defect') && (
                <FormField
                    control={form.control}
                    name="aircraftId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Aircraft Involved</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an aircraft" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {aircrafts.map(ac => (
                                    <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.model})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
             <Separator />
            
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Detailed Description of Event</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Describe the event in detail. What happened? What were the conditions? What actions were taken?"
                        className="min-h-32"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
