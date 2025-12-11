'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addHours, format, setHours, setMinutes } from 'date-fns';
import { Timestamp, collection, doc } from 'firebase/firestore';
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
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time.',
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
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    if (!firestore) return;

    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    
    const startTime = setMinutes(setHours(initialData.date, startHour), startMinute);
    const endTime = setMinutes(setHours(initialData.date, endHour), endMinute);

    const bookingData = {
        ...data,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
    };

    if (isEditing) {
      // Update existing booking
      const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking!.id);
      updateDocumentNonBlocking(bookingRef, bookingData);
      toast({
        title: 'Booking Updated',
        description: 'The booking has been successfully updated.',
      });
    } else {
      // Create new booking
      const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
      addDocumentNonBlocking(bookingsRef, bookingData);
      toast({
        title: 'Booking Created',
        description: 'The new booking has been added to the schedule.',
      });
    }
    onClose();
  };

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

  const handleDeleteBooking = () => {
    if (!isEditing || !firestore) return;
    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking!.id);
    deleteDocumentNonBlocking(bookingRef);
    toast({
      title: 'Booking Deleted',
      description: 'The booking has been permanently deleted.',
    });
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter className="pt-4 flex flex-row justify-center items-stretch gap-2">
            <Button type="submit" className='flex-1'>{isEditing ? 'Save' : 'Create Booking'}</Button>
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
        </form>
        </ScrollArea>
      </Form>
      
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
                    This action cannot be undone. This will permanently delete the booking from the database.
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
