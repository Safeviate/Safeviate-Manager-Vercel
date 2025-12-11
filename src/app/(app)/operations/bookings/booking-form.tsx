
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addHours, format, setHours, setMinutes, addDays, startOfDay, isSameDay, endOfDay, isBefore } from 'date-fns';
import { Timestamp, collection, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection } from '@/firebase';
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
import { Textarea } from '@/components/ui/textarea';
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
import { getNextBookingNumber, deleteBookingAndDecrementCounter } from './booking-functions';


interface BookingFormProps {
  tenantId: string;
  aircraftList: Aircraft[];
  pilotList: PilotProfile[];
  allBookings: Booking[]; // Pass all bookings to find the other part of an overnight booking
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
  status: z.enum(['Confirmed', 'Pending', 'Cancelled', 'Cancelled with Reason']),
  isOvernight: z.boolean(),
  overnightEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format.').optional(),
  cancellationReason: z.string().optional(),
}).refine(data => {
    if (data.isOvernight) return true; // Validation for overnight is handled separately
    return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time for a single-day booking.',
  path: ['endTime'],
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({ tenantId, aircraftList, pilotList, allBookings, initialData, onClose }: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!initialData.booking;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: (() => {
        const isEditMode = !!initialData.booking;
        const isOvernightBooking = !!initialData.booking?.overnightId;

        if (isEditMode && isOvernightBooking) {
            const currentPart = initialData.booking!;
            const otherPart = allBookings.find(b => 
                b.overnightId === currentPart.overnightId && b.id !== currentPart.id
            );

            // Determine which part is Day 1 and which is Day 2 by comparing start times
            let day1Part: Booking | undefined;
            let day2Part: Booking | undefined;

            if (otherPart && isBefore(currentPart.startTime.toDate(), otherPart.startTime.toDate())) {
                day1Part = currentPart;
                day2Part = otherPart;
            } else if (otherPart) {
                day1Part = otherPart;
                day2Part = currentPart;
            } else { // Fallback if only one part is found (e.g. other part is on a different day than fetched)
                day1Part = currentPart;
            }
            
            return {
                aircraftId: initialData.aircraft.id,
                pilotId: currentPart.pilotId,
                instructorId: currentPart.instructorId || '',
                type: currentPart.type,
                startTime: day1Part ? format(day1Part.startTime.toDate(), 'HH:mm') : '00:00',
                endTime: '23:59', // Day 1 always ends at midnight
                status: currentPart.status,
                isOvernight: true,
                overnightEndTime: day2Part ? format(day2Part.endTime.toDate(), 'HH:mm') : '08:00',
            };
        }

        // Default values for new bookings or standard edit
        return {
            aircraftId: initialData.aircraft.id,
            pilotId: initialData.booking?.pilotId || '',
            instructorId: initialData.booking?.instructorId || '',
            type: initialData.booking?.type || 'Student Training',
            startTime: initialData.booking ? format(initialData.booking.startTime.toDate(), 'HH:mm') : initialData.time,
            endTime: initialData.booking ? format(initialData.booking.endTime.toDate(), 'HH:mm') : format(addHours(new Date(`1970-01-01T${initialData.time}`), 2), 'HH:mm'),
            status: initialData.booking?.status || 'Confirmed',
            isOvernight: false,
            overnightEndTime: '08:00',
        };
    })(),
});
  
  const isOvernight = form.watch('isOvernight');

  useEffect(() => {
    if (isOvernight && !isEditing) {
        form.setValue('endTime', '23:59');
    }
  }, [isOvernight, form, isEditing]);

  const onSubmit = async (data: BookingFormValues) => {
    if (!firestore) return;

    if (isEditing) {
      if (initialData.booking?.overnightId) {
        await handleOvernightUpdate(data, initialData.booking.overnightId);
      } else {
        handleStandardBooking(data, initialData.booking?.bookingNumber);
      }
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
    const endTime = endOfDay(initialData.date); // End of the first day

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
    
    const nextDayStartTime = startOfDay(nextDay);
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

  const handleOvernightUpdate = async (data: BookingFormValues, overnightId: string) => {
    if (!firestore) return;
  
    const bookingsToUpdate = allBookings.filter(b => b.overnightId === overnightId);
    if (bookingsToUpdate.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not find the overnight booking parts to update.',
      });
      return;
    }
  
    const day1Part = bookingsToUpdate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())[0];
    const day2Part = bookingsToUpdate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())[1];
  
    if (!day1Part || !day2Part) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not identify both parts of the overnight booking.',
          });
          return;
    }

    // --- Prepare updates for Day 1 ---
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const newDay1StartTime = setMinutes(setHours(day1Part.startTime.toDate(), startHour), startMinute);
    const day1BookingData: Partial<Booking> = {
        ...data,
        startTime: Timestamp.fromDate(newDay1StartTime),
        endTime: Timestamp.fromDate(endOfDay(day1Part.startTime.toDate())), // Always ends at 23:59
    };
    delete (day1BookingData as any).isOvernight;
    delete (day1BookingData as any).overnightEndTime;


    // --- Prepare updates for Day 2 ---
    const [endHour, endMinute] = (data.overnightEndTime || "00:00").split(':').map(Number);
    const newDay2EndTime = setMinutes(setHours(day2Part.startTime.toDate(), endHour), endMinute);
    const day2BookingData: Partial<Booking> = {
        ...data,
        startTime: Timestamp.fromDate(startOfDay(day2Part.startTime.toDate())), // Always starts at 00:00
        endTime: Timestamp.fromDate(newDay2EndTime),
    };
    delete (day2BookingData as any).isOvernight;
    delete (day2BookingData as any).overnightEndTime;
  
    // --- Perform transactional update ---
    const day1Ref = doc(firestore, 'tenants', tenantId, 'bookings', day1Part.id);
    const day2Ref = doc(firestore, 'tenants', tenantId, 'bookings', day2Part.id);
  
    updateDocumentNonBlocking(day1Ref, day1BookingData);
    updateDocumentNonBlocking(day2Ref, day2BookingData);

    toast({
      title: 'Overnight Booking Updated',
      description: 'The booking details have been updated across both days.',
    });
  };


  const handleCancelBooking = () => {
    if (!isEditing || !firestore) {
        return;
    }

    if (!cancellationReason.trim()) {
        toast({
            variant: 'destructive',
            title: 'Reason Required',
            description: 'Please provide a reason for the cancellation.',
        });
        return;
    }

    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking!.id);
    updateDocumentNonBlocking(bookingRef, { status: 'Cancelled with Reason', cancellationReason: cancellationReason });
    
    toast({
      title: 'Booking Cancelled',
      description: 'The booking has been marked as cancelled with a reason.',
    });

    setIsCancelDialogOpen(false);
    setCancellationReason('');
    onClose();
  };

  const handleDeleteBooking = async () => {
    if (!isEditing || !firestore) return;

    const { booking } = initialData;
    if (!booking) return;

    try {
        let docsToDelete: any[] = [];
        if (booking.overnightId) {
            // This is an overnight booking, find all parts to delete
            const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
            const q = query(bookingsRef, where('overnightId', '==', booking.overnightId));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                docsToDelete.push(doc.ref);
            });
        } else {
            // This is a standard booking
            docsToDelete.push(doc(firestore, 'tenants', tenantId, 'bookings', booking.id));
        }

        if (docsToDelete.length > 0) {
            // Only decrement counter once per booking number, even for overnight
            await deleteBookingAndDecrementCounter(firestore, tenantId, docsToDelete);
            toast({
                title: 'Booking Deleted',
                description: 'The booking has been permanently deleted and the booking number has been updated.',
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
          {isEditing ? `Editing booking #${initialData.booking?.bookingNumber} for ${initialData.aircraft.tailNumber}` : `New booking for ${initialData.aircraft.tailNumber} on ${format(initialData.date, 'PPP')}`}
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
                      disabled={isEditing}
                  />
                  </FormControl>
              </FormItem>
              )}
          />


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
                  <FormLabel>{isOvernight ? 'End Time (Day 1)' : 'End Time'}</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} disabled={isOvernight} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isOvernight && (
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
                    Please provide a reason for cancelling this booking. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label htmlFor="cancellation-reason" className="sr-only">Cancellation Reason</Label>
                <Textarea
                    id="cancellation-reason"
                    placeholder="Type your reason here..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCancellationReason('')}>Go Back</AlertDialogCancel>
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
