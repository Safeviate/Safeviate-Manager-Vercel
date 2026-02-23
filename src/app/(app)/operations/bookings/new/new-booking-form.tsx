
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  resourceId: z.string().min(1, "An aircraft must be selected."),
  date: z.date({ required_error: "A date is required."}),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)."),
  instructorId: z.string().optional(),
  studentId: z.string().optional(),
  notes: z.string().optional(),
});

export type NewBookingFormValues = z.infer<typeof formSchema>;

interface NewBookingFormProps {
  aircrafts: Aircraft[];
  instructors: PilotProfile[];
  students: PilotProfile[];
  onSubmit: (values: NewBookingFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function NewBookingForm({ aircrafts, instructors, students, onSubmit, isSubmitting }: NewBookingFormProps) {
  const router = useRouter();
  const form = useForm<NewBookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      resourceId: '',
      date: new Date(),
      startTime: '',
      endTime: '',
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Booking</CardTitle>
            <CardDescription>
              Schedule a new flight or event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title / Purpose</FormLabel><FormControl><Input placeholder="e.g., PPL Lesson 3, Solo Cross-Country" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="resourceId" render={({ field }) => (<FormItem><FormLabel>Aircraft</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an aircraft" /></SelectTrigger></FormControl><SelectContent>{aircrafts.map(ac => (<SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.model})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
                 <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Start Time (24h)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>End Time (24h)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="instructorId" render={({ field }) => (<FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an instructor" /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="studentId" render={({ field }) => (<FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger></FormControl><SelectContent>{students.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional details about the booking..." {...field} /></FormControl><FormMessage /></FormItem>)} />
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Create Booking'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
