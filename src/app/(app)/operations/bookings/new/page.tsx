
'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewBookingForm, type NewBookingFormValues } from './new-booking-form';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';

export default function NewBookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
  
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);

  const isLoading = isLoadingAircrafts || isLoadingInstructors || isLoadingStudents;

  const handleNewBooking = async (values: NewBookingFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
      return;
    }
    
    setIsSubmitting(true);

    const { date, startTime, endTime, ...rest } = values;
    const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${startTime}`);
    const endDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${endTime}`);

    const bookingData = {
        ...rest,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime,
        endTime,
        status: 'Confirmed' as const,
    };

    try {
        const bookingsCollection = collection(firestore, `tenants/${tenantId}/bookings`);
        await addDocumentNonBlocking(bookingsCollection, bookingData);
        
        toast({
            title: 'Booking Created',
            description: 'The new booking has been added to the schedule.',
        });
        
        router.push('/operations/bookings');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <NewBookingForm
      aircrafts={aircrafts || []}
      instructors={instructors || []}
      students={students || []}
      onSubmit={handleNewBooking}
      isSubmitting={isSubmitting}
    />
  );
}
