'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addHours, format, setHours, setMinutes, addDays, startOfDay } from 'date-fns';
import { Timestamp, collection, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';

import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { v4 as uuidv4 } from 'uuid';
import { getNextBookingNumber } from './booking-functions';


interface BookingFormProps {
  tenantId: string;
  aircraftList: Aircraft[];
  pilotList: PilotProfile[];
  initialData: {
    aircraft: Aircraft;
    time: string;
    date: Date;
    booking?: Booking;
  };
  onClose: () => void;
}

const bookingSchema = z.object({
  aircraftId: z.string().min(1, 'Aircraft is required.'),
  pilotId: z.string().min(1, 'Pilot is required.'),
  instructorId: z.string().optional(),
  type: z.enum(['Student Training', 'Hire and Fly'], { required_error: 'Booking type is required.' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format.'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format.'),
  status: z.enum(['Confirmed', 'Pending', 'Cancelled']),
  isOvernight: z.boolean(),
  overnightEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format.').optional(),
}).refine(data => {
    if (data.isOvernight) return true; // Validation for overnight is handled separately
    return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time for a single-day booking.',
  path: ['endTime'],
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({ tenantId, aircraftList, pilotList, initialData, onClose }: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!initialData.booking;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      aircraftId: initialData.aircraft.id,
      pilotId: initialData.booking?.pilotId || '',
      instructorId: initialData.booking?.instructorId || '',
      type: initialData.booking?.type || 'Student Training',
      startTime: initialData.booking ? format(initialData.booking.startTime.toDate(), 'HH:mm') : initialData.time,
      endTime: initialData.booking ? format(initialData.booking.endTime.toDate(), 'HH:mm') : format(addHours(new Date(`1970-01-01T${initialData.time}`), 2), 'HH:mm'),
      status: initialData.booking?.status || 'Confirmed',
      isOvernight: !!initialData.booking?.overnightId,
      overnightEndTime: '02:00',
    },
  });
  
  const isOvernight = form.watch('isOvernight');

  useEffect(() => {
    if (isOvernight) {
        form.setValue('endTime', '23:59');
    }
  }, [isOvernight, form]);

  const onSubmit = async (data: BookingFormValues) => {
    if (!firestore) return;
  
    if (isEditing) {
      // Editing doesn't support changing overnight status or booking numbers for simplicity
      handleStandardBooking(data, initialData.booking?.bookingNumber);
    } else {
      try {
        const bookingNumber = await getNextBookingNumber(firestore, tenantId, 'bookings');
        if (data.isOvernight) {
          handleOvernightBooking(data, bookingNumber);
        } else {
          handleStandardBooking(data, bookingNumber);
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: 'Could not generate a booking number. Please try again.',
        });
        return; // Stop execution if we can't get a booking number
      }
    }
    onClose();
  };
  

  const handleStandardBooking = (data: BookingFormValues, bookingNumber?: number) => {
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    
    const startTime = setMinutes(setHours(initialData.date, startHour), startMinute);
    const endTime = setMinutes(setHours(initialData.date, endHour), endMinute);

    const bookingData: Partial<Booking> = {
        ...data,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
    };

    if (bookingNumber) {
        bookingData.bookingNumber = bookingNumber;
    }


    if (isEditing) {
      const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking!.id);
      updateDocumentNonBlocking(bookingRef, bookingData);
      toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
    } else {
      const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
      addDocumentNonBlocking(bookingsRef, bookingData);
      toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
    }
  }

  const handleOvernightBooking = (data: BookingFormValues, bookingNumber: number) => {
    const overnightId = uuidv4();

    // Part 1: Booking for the current day
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const startTime = setMinutes(setHours(initialData.date, startHour), startMinute);
    const endTime = setMinutes(setHours(initialData.date, 23), 59);

    const bookingData1: Partial<Booking> = {
        ...data,
        bookingNumber,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        overnightId: overnightId,
    };
    delete (bookingData1 as any).isOvernight;
    delete (bookingData1 as any).overnightEndTime;

    // Part 2: Booking for the next day
    const nextDay = addDays(startOfDay(initialData.date), 1);
    const [overnightEndHour, overnightEndMinute] = (data.overnightEndTime || "00:00").split(':').map(Number);
    
    const nextDayStartTime = setMinutes(setHours(nextDay, 0), 0);
    const nextDayEndTime = setMinutes(setHours(nextDay, overnightEndHour), overnightEndMinute);

    const bookingData2: Partial<Booking> = {
        ...data,
        bookingNumber,
        startTime: Timestamp.fromDate(nextDayStartTime),
        endTime: Timestamp.fromDate(nextDayEndTime),
        overnightId: overnightId,
    };
    delete (bookingData2 as any).isOvernight;
    delete (bookingData2 as any).overnightEndTime;

    // Save both bookings
    const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
    addDocumentNonBlocking(bookingsRef, bookingData1);
    addDocumentNonBlocking(bookingsRef, bookingData2);

    toast({
        title: 'Overnight Booking Created',
        description: `Booking #${bookingNumber} has been split for the schedule.`,
    });
  }


  const handleCancelBooking = () => {
    if (!isEditing || !firestore) return;
    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking!.id);
    updateDocumentNonBlocking(bookingRef, { status: 'Cancelled' });
    toast({
      title: 'Booking Cancelled',
      description: 'The booking has been marked as cancelled.',
    });
    onClose();
  };

  const handleDeleteBooking = async () => {
    if (!isEditing || !firestore) return;

    const { booking } = initialData;
    if (!booking) return;

    try {
        if (booking.overnightId) {
            // This is an overnight booking, delete all parts
            const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
            const q = query(bookingsRef, where('overnightId', '==', booking.overnightId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Fallback to deleting just the single document if no others are found
                await deleteDocumentNonBlocking(doc(firestore, 'tenants', tenantId, 'bookings', booking.id));
            } else {
                 const batch = writeBatch(firestore);
                 querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                 });
                 await batch.commit();
            }
            toast({
                title: 'Overnight Booking Deleted',
                description: 'All parts of the overnight booking have been deleted.',
            });

        } else {
            // This is a standard booking
            const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
            await deleteDocumentNonBlocking(bookingRef);
            toast({
              title: 'Booking Deleted',
              description: 'The booking has been permanently deleted.',
            });
        }
    } catch (error) {
        console.error("Error deleting booking(s):", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the booking(s).",
        });
    }
    
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Booking' : 'Create Booking'}</DialogTitle>
        <DialogDescription>
          {isEditing ? `Editing booking for ${initialData.aircraft.tailNumber}` : `New booking for ${initialData.aircraft.tailNumber} on ${format(initialData.date, 'PPP')}`}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
      <ScrollArea className="max-h-[60vh]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-1">
          <FormField
            control={form.control}
            name="aircraftId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aircraft</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an aircraft" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {aircraftList.map(ac => <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Booking Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select booking type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Student Training">Student Training</SelectItem>
                    <SelectItem value="Hire and Fly">Hire and Fly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pilotId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pilot / Student</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pilot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pilotList.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('type') === 'Student Training' && (
              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select an instructor" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {pilotList.filter(p => p.userType === 'Instructor').map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
          )}

        {!isEditing && (
            <FormField
                control={form.control}
                name="isOvernight"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                    <FormLabel>Overnight Booking</FormLabel>
                    <FormMessage />
                    </div>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        )}


          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isOvernight && !isEditing ? 'End Time (Day 1)' : 'End Time'}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} disabled={isOvernight && !isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isOvernight && !isEditing && (
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="overnightEndTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time (Day 2)</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>
          )}
        </form>
        </ScrollArea>
      </Form>
      <DialogFooter className="pt-4 flex flex-row justify-center items-stretch gap-2">
          <Button type="submit" className='flex-1' onClick={form.handleSubmit(onSubmit)}>{isEditing ? 'Save' : 'Create Booking'}</Button>
            {isEditing && (
              <>
                <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className='flex-1'>
                    Delete
                </Button>
                <Button type="button" variant="outline" className='text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive flex-1' onClick={() => setIsCancelDialogOpen(true)} >
                    Cancel
                </Button>
              </>
          )}
      </DialogFooter>
      
      {/* Cancel Confirmation */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will mark the booking as cancelled but it will remain in the system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelBooking} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Yes, Cancel Booking
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the booking from the database. If this is an overnight booking, all parts will be deleted.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBooking} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Yes, Delete Forever
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    