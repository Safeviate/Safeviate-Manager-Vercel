'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { StudentProgressReport } from '@/types/training';
import { useEffect } from 'react';

const performanceRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const progressEntrySchema = z.object({
  id: z.string(),
  exercise: z.string().min(1, 'Exercise name is required.'),
  rating: performanceRatingSchema,
  comment: z.string().min(1, 'A comment is required.'),
});

const formSchema = z.object({
  entries: z.array(progressEntrySchema).min(1, 'At least one exercise entry is required.'),
  overallComment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const getRatingColor = (rating: number) => {
    switch (rating) {
        case 1: return 'bg-red-500 border-red-700';
        case 2: return 'bg-orange-500 border-orange-700';
        case 3: return 'bg-yellow-500 border-yellow-700';
        case 4: return 'bg-green-500 border-green-700';
        default: return 'bg-gray-400';
    }
}

export function StudentDebriefForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const firestore = useFirestore();
  const { toast } = useToast();

  const tenantId = 'safeviate';

  const bookingRef = useMemoFirebase(
    () => (firestore && bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, bookingId) : null),
    [firestore, bookingId]
  );

  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  const studentRef = useMemoFirebase(
    () => (firestore && booking?.studentId ? doc(firestore, `tenants/${tenantId}/students`, booking.studentId) : null),
    [firestore, booking?.studentId, tenantId]
  );
  
  const { data: student, isLoading: isLoadingStudent } = useDoc<PilotProfile>(studentRef);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entries: [],
      overallComment: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'entries',
  });

  const isLoading = isLoadingBooking || isLoadingStudent;

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !booking || !student) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to save debrief.' });
        return;
    }

    const reportData: Omit<StudentProgressReport, 'id'> = {
        bookingId: booking.id,
        studentId: student.id,
        instructorId: booking.instructorId!,
        date: new Date().toISOString(),
        entries: values.entries,
        overallComment: values.overallComment,
    };
    
    await addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/student-progress-reports`), reportData);

    toast({ title: "Debrief Saved", description: "The student's progress report has been filed." });
    router.push('/training/student-progress');
  };

  if (!bookingId) {
    return <p>Booking ID is missing.</p>;
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!booking || !student) {
    return <p>Booking or student not found.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Debrief</CardTitle>
        <CardDescription>
          For {student.firstName} {student.lastName} on {format(new Date(booking.date), 'PPP')} (Booking #{booking.bookingNumber})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/20">
                    <div className="flex justify-end mb-2">
                         <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name={`entries.${index}.exercise`} render={({ field }) => ( <FormItem><FormLabel>Exercise</FormLabel><FormControl><Input placeholder="e.g., Steep Turns" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.rating`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Performance Rating</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={String(field.value)}
                              className="flex items-center gap-2 pt-2"
                            >
                              {[1, 2, 3, 4].map(rating => (
                                <FormItem key={rating} className='flex-1'>
                                  <FormControl>
                                    <RadioGroupItem value={String(rating)} className="sr-only" />
                                  </FormControl>
                                  <FormLabel
                                    className={cn(
                                      "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-20",
                                      field.value === rating && "border-primary"
                                    )}
                                  >
                                    <span className={cn("w-6 h-6 rounded-full", getRatingColor(rating))}></span>
                                    {rating}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="md:col-span-2">
                        <FormField control={form.control} name={`entries.${index}.comment`} render={({ field }) => ( <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea placeholder="Detailed feedback on the performance..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                     </div>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={() => append({ id: uuidv4(), exercise: '', rating: 3, comment: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
              </Button>
            </div>
            
            <FormField control={form.control} name="overallComment" render={({ field }) => ( <FormItem><FormLabel>Overall Comments & Plan for Next Session</FormLabel><FormControl><Textarea placeholder="Summarize the session and outline goals for the next flight..." className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )} />

            <div className="flex justify-end">
              <Button type="submit">Submit Debrief</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
