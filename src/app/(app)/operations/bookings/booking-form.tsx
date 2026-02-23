
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, isEqual } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile, Personnel } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const bookingFormSchema = z.object({
    type: z.string().min(1, 'Booking type is required.'),
    date: z.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time"),
    instructorId: z.string().optional(),
    studentId: z.string().optional(),
    isOvernight: z.boolean().default(false),
    overnightBookingDate: z.date().optional(),
    overnightEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid overnight end time").optional(),
    notes: z.string().optional(),
    preFlight: z.boolean().default(false),
    postFlight: z.boolean().default(false),
    status: z.enum(['Tentative', 'Confirmed', 'Completed', 'Cancelled', 'Cancelled with Reason']).default('Confirmed'),
    cancellationReason: z.string().optional(),
})
.refine(data => {
    const start = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
    const end = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`);
    return isBefore(start, end);
}, {
    message: "End time must be after start time",
    path: ["endTime"],
})
.refine(data => {
    if (data.isOvernight && data.overnightBookingDate && data.overnightEndTime) {
        const start = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
        const overnightEnd = new Date(`${format(data.overnightBookingDate, 'yyyy-MM-dd')}T${data.overnightEndTime}`);
        return isBefore(start, overnightEnd);
    }
    return true;
}, {
    message: "Overnight end time must be after the booking start",
    path: ["overnightEndTime"],
})
.refine(data => {
    if (data.status === 'Cancelled with Reason') {
        return !!data.cancellationReason?.trim();
    }
    return true;
}, {
    message: 'A reason is required for cancellation.',
    path: ['cancellationReason'],
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    aircraft: Aircraft;
    startTime: Date;
    tenantId: string;
    pilots: (PilotProfile | Personnel)[];
    allBookingsForAircraft: Booking[];
    existingBooking?: Booking;
    refreshBookings: () => void;
}

export function BookingForm({ isOpen, setIsOpen, aircraft, startTime, tenantId, pilots, allBookingsForAircraft, existingBooking, refreshBookings }: BookingFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
    const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);

    const defaultValues = useMemo(() => ({
        type: existingBooking?.type || '',
        date: existingBooking ? new Date(existingBooking.date) : startTime,
        startTime: existingBooking ? existingBooking.startTime : format(startTime, 'HH:mm'),
        endTime: existingBooking ? existingBooking.endTime : format(addMinutes(startTime, 60), 'HH:mm'),
        instructorId: existingBooking?.instructorId || '',
        studentId: existingBooking?.studentId || '',
        isOvernight: existingBooking?.isOvernight || false,
        overnightBookingDate: existingBooking?.overnightBookingDate ? new Date(existingBooking.overnightBookingDate) : undefined,
        overnightEndTime: existingBooking?.overnightEndTime || '08:00',
        notes: existingBooking?.notes || '',
        preFlight: existingBooking?.preFlight || false,
        postFlight: existingBooking?.postFlight || false,
        status: existingBooking?.status || 'Confirmed',
        cancellationReason: '',
    }), [existingBooking, startTime]);
    
    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingFormSchema),
        defaultValues,
    });
    
    useEffect(() => {
        form.reset(defaultValues);
    }, [isOpen, defaultValues, form]);

    const isOvernight = form.watch('isOvernight');
    const watchStatus = form.watch('status');

    const onSubmit = async (data: BookingFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
        const bookingData: Partial<Booking> = {
            aircraftId: aircraft.id,
            type: data.type,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: data.startTime,
            endTime: data.endTime,
            start: new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`).toISOString(),
            end: new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`).toISOString(),
            instructorId: data.instructorId,
            studentId: data.studentId,
            status: data.status,
            notes: data.notes,
            preFlight: data.preFlight,
            postFlight: data.postFlight,
            isOvernight: data.isOvernight,
            overnightBookingDate: data.isOvernight && data.overnightBookingDate ? format(data.overnightBookingDate, 'yyyy-MM-dd') : undefined,
            overnightEndTime: data.isOvernight ? data.overnightEndTime : undefined,
        };

        if (data.status === 'Cancelled with Reason') {
            bookingData.notes = `Cancelled: ${data.cancellationReason}\n\n${data.notes || ''}`;
            bookingData.status = 'Cancelled';
        }

        try {
            if (existingBooking) {
                const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, existingBooking.id);
                await updateDocumentNonBlocking(bookingRef, bookingData);
                toast({ title: 'Booking Updated' });
            } else {
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
                toast({ title: 'Booking Created' });
            }
            refreshBookings();
            setIsOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!firestore || !existingBooking) return;
        setIsSubmitting(true);
        try {
            const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, existingBooking.id);
            await deleteDocumentNonBlocking(bookingRef);
            toast({ title: 'Booking Deleted' });
            refreshBookings();
            setIsOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{existingBooking ? `Edit Booking #${existingBooking.bookingNumber}` : `New Booking for ${aircraft.tailNumber}`}</DialogTitle>
                    <DialogDescription>
                        {format(startTime, 'PPP')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Booking Type</FormLabel><FormControl><Input placeholder='e.g., Training, Rental' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Tentative', 'Confirmed', 'Completed', 'Cancelled', 'Cancelled with Reason'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>
                        {watchStatus === 'Cancelled with Reason' && (
                             <FormField control={form.control} name="cancellationReason" render={({ field }) => ( <FormItem><FormLabel>Reason for Cancellation</FormLabel><FormControl><Input placeholder='e.g., Weather, Maintenance' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="instructorId" render={({ field }) => ( <FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Instructor..." /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Student..." /></SelectTrigger></FormControl><SelectContent>{students.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Add any relevant notes for the booking..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        
                        <div className="flex items-center space-x-2">
                             <FormField control={form.control} name="isOvernight" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} id="isOvernight" /></FormControl><FormLabel htmlFor="isOvernight">Overnight Booking</FormLabel></FormItem> )}/>
                        </div>

                        {isOvernight && (
                             <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                                 <FormField control={form.control} name="overnightBookingDate" render={({ field }) => ( <FormItem><FormLabel>Return Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                                 <FormField control={form.control} name="overnightEndTime" render={({ field }) => ( <FormItem><FormLabel>Return Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                             </div>
                        )}
                        <DialogFooter>
                            {existingBooking && (
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" className="mr-auto"><Trash2 /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete booking #{existingBooking.bookingNumber}.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Booking'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
