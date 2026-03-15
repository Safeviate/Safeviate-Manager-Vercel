'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewBookingForm, type NewBookingFormValues } from './new-booking-form';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function NewBookingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { userProfile } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const canManageSchedule = hasPermission('bookings-schedule-manage');

  useEffect(() => {
    if (!canManageSchedule && user) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to create aircraft bookings.' });
        router.push('/bookings/schedule');
    }
  }, [canManageSchedule, user, router, toast]);

  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
  
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);

  const isLoading = isLoadingAircrafts || isLoadingInstructors || isLoadingStudents;

  const handleNewBooking = async (values: NewBookingFormValues) => {
    if (!firestore || !canManageSchedule) return;
    
    setIsSubmitting(true);

    const { date, startTime, endTime, ...rest } = values;
    const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${startTime}`);
    const endDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${endTime}`);

    // Clean data to avoid undefined values in Firestore
    const bookingData: any = {
        ...rest,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime,
        endTime,
        status: 'Confirmed' as const,
        preFlight: false,
        postFlight: false,
        instructorId: rest.instructorId || null,
        studentId: rest.studentId || null,
        notes: rest.notes || null,
        createdById: userProfile?.id || user?.uid || null,
    };

    try {
        const counterRef = doc(firestore, `tenants/${tenantId}/counters`, 'bookings');
        const bookingsCollection = collection(firestore, `tenants/${tenantId}/bookings`);
        
        await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const newCount = (counterDoc.data()?.currentNumber || 0) + 1;
            transaction.set(counterRef, { currentNumber: newCount });
            
            const newBookingRef = doc(bookingsCollection);
            transaction.set(newBookingRef, {
                ...bookingData,
                id: newBookingRef.id,
                bookingNumber: String(newCount).padStart(5, '0'),
            });
        });
        
        toast({
            title: 'Booking Created',
            description: 'The new booking has been added to the schedule.',
        });
        
        router.push('/bookings/schedule');

    } catch (error: any) {
        console.error("Create Booking Error:", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading || !canManageSchedule) {
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
