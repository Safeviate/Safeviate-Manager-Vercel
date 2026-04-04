'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewBookingForm, type NewBookingFormValues } from './new-booking-form';
import type { Aircraft } from '@/types/aircraft';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function NewBookingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const canManageSchedule = hasPermission('bookings-schedule-manage');

  useEffect(() => {
    if (!canManageSchedule) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to create aircraft bookings.' });
        router.push('/bookings/schedule');
    }
  }, [canManageSchedule, router, toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/schedule-data', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled) {
          setAircrafts((payload?.aircraft ?? []) as Aircraft[]);
        }
      } catch {
        if (!cancelled) {
          setAircrafts([]);
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const isLoading = isLoadingData;

  const handleNewBooking = async (values: NewBookingFormValues) => {
    if (!tenantId || !canManageSchedule) return;
    
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
        createdById: tenantId || null,
    };

    try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking: bookingData }),
        });
        if (!response.ok) throw new Error((await response.json())?.error || 'Failed to create booking.');
        
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
      instructors={[]}
      students={[]}
      onSubmit={handleNewBooking}
      isSubmitting={isSubmitting}
    />
  );
}
