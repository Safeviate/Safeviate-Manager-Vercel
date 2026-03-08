
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { format, addMinutes, isBefore } from 'date-fns';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

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
    preFlightData: z.object({
        hobbs: z.number().optional(),
        tacho: z.number().optional(),
        fuelOnBoard: z.number().optional(),
        oilUplift: z.number().optional(),
        documentsChecked: z.boolean().default(true),
    }).optional(),
    postFlightData: z.object({
        hobbs: z.number().optional(),
        tacho: z.number().optional(),
        fuelRemaining: z.number().optional(),
        defects: z.string().optional(),
    }).optional(),
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
    const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);

    const defaultValues = useMemo(() => ({
        type: existingBooking?.type || 'Training Flight',
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
        preFlightData: existingBooking?.preFlightData || {
            hobbs: aircraft.currentHobbs || 0,
            tacho: aircraft.currentTacho || 0,
            fuelOnBoard: 0,
            oilUplift: 0,
            documentsChecked: true,
        },
        postFlightData: existingBooking?.postFlightData || {
            hobbs: (aircraft.currentHobbs || 0) + 1,
            tacho: (aircraft.currentTacho || 0) + 0.8,
            fuelRemaining: 0,
            defects: '',
        },
    }), [existingBooking, startTime, aircraft]);
    
    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingFormSchema),
        defaultValues,
    });
    
    useEffect(() => {
        if (isOpen) {
            form.reset(defaultValues);
        }
    }, [isOpen, defaultValues, form]);

    const isOvernight = form.watch('isOvernight');
    const watchStatus = form.watch('status');
    const watchPreFlight = form.watch('preFlight');
    const watchPostFlight = form.watch('postFlight');

    const onSubmit = async (data: BookingFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
        // Construct clean booking data to avoid 'undefined' values in Firestore
        const bookingData: any = {
            aircraftId: aircraft.id,
            type: data.type,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: data.startTime,
            endTime: data.endTime,
            start: new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`).toISOString(),
            end: new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`).toISOString(),
            instructorId: data.instructorId || null,
            studentId: data.studentId || null,
            status: data.status,
            notes: data.notes || null,
            preFlight: data.preFlight,
            postFlight: data.postFlight,
            isOvernight: data.isOvernight,
        };

        if (data.isOvernight && data.overnightBookingDate) {
            bookingData.overnightBookingDate = format(data.overnightBookingDate, 'yyyy-MM-dd');
            bookingData.overnightEndTime = data.overnightEndTime || null;
        } else {
            bookingData.overnightBookingDate = null;
            bookingData.overnightEndTime = null;
        }

        if (data.preFlight && data.preFlightData) {
            bookingData.preFlightData = {
                hobbs: data.preFlightData.hobbs ?? 0,
                tacho: data.preFlightData.tacho ?? 0,
                fuelOnBoard: data.preFlightData.fuelOnBoard ?? 0,
                oilUplift: data.preFlightData.oilUplift ?? 0,
                documentsChecked: data.preFlightData.documentsChecked ?? true,
            };
        } else {
            bookingData.preFlightData = null;
        }

        if (data.postFlight && data.postFlightData) {
            bookingData.postFlightData = {
                hobbs: data.postFlightData.hobbs ?? 0,
                tacho: data.postFlightData.tacho ?? 0,
                fuelRemaining: data.postFlightData.fuelRemaining ?? 0,
                defects: data.postFlightData.defects || null,
            };
        } else {
            bookingData.postFlightData = null;
        }

        if (data.status === 'Cancelled with Reason') {
            bookingData.notes = `Cancelled: ${data.cancellationReason}\n\n${data.notes || ''}`;
            bookingData.status = 'Cancelled';
        }

        try {
            if (existingBooking) {
                const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, existingBooking.id);
                updateDocumentNonBlocking(bookingRef, bookingData);
                
                // If the flight is completed, update the aircraft total hours
                if (data.status === 'Completed' && data.postFlight && data.postFlightData?.hobbs) {
                    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
                    updateDocumentNonBlocking(aircraftRef, {
                        currentHobbs: data.postFlightData.hobbs,
                        currentTacho: data.postFlightData.tacho,
                    });
                }
                
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
            console.error("Save Error:", error);
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingBooking ? `Edit Booking #${existingBooking.bookingNumber}` : `New Booking for ${aircraft.tailNumber}`}</DialogTitle>
                    <DialogDescription>
                        {format(startTime, 'PPP')} • Current Aircraft Hobbs: {aircraft.currentHobbs || 0}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Booking Type</FormLabel><FormControl><Input placeholder='e.g., Training, Rental' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Tentative', 'Confirmed', 'Completed', 'Cancelled', 'Cancelled with Reason'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>

                        {watchStatus === 'Cancelled with Reason' && (
                             <FormField control={form.control} name="cancellationReason" render={({ field }) => ( <FormItem><FormLabel>Reason for Cancellation</FormLabel><FormControl><Input placeholder='e.g., Weather, Maintenance' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="instructorId" render={({ field }) => ( <FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Instructor..." /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Student..." /></SelectTrigger></FormControl><SelectContent>{students.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="preFlight" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Pre-Flight Complete</FormLabel>
                                        <FormDescription>Start Hobbs/Tacho and Fuel</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="postFlight" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Post-Flight Complete</FormLabel>
                                        <FormDescription>End Hobbs/Tacho and Defects</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch 
                                            checked={field.value} 
                                            onCheckedChange={field.onChange} 
                                            disabled={!existingBooking || !existingBooking.preFlight}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}/>
                        </div>

                        {watchPreFlight && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
                                <h4 className="col-span-full font-semibold text-sm">Pre-Flight Data</h4>
                                <FormField control={form.control} name="preFlightData.hobbs" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Start Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="preFlightData.tacho" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Start Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="preFlightData.fuelOnBoard" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Fuel (Gal)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="preFlightData.oilUplift" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Oil (Qts)</FormLabel><FormControl><Input type="number" step="0.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )}/>
                            </div>
                        )}

                        {watchPostFlight && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
                                <h4 className="col-span-full font-semibold text-sm">Post-Flight Data</h4>
                                <FormField control={form.control} name="postFlightData.hobbs" render={({ field }) => ( <FormItem><FormLabel className="text-xs">End Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="postFlightData.tacho" render={({ field }) => ( <FormItem><FormLabel className="text-xs">End Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="postFlightData.fuelRemaining" render={({ field }) => ( <FormItem><FormLabel className="text-xs">Fuel Remaining</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem> )}/>
                                <FormField control={form.control} name="postFlightData.defects" render={({ field }) => ( <FormItem className="col-span-full"><FormLabel className="text-xs">Defects / Observations</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Admin Notes</FormLabel><FormControl><Textarea placeholder="Add any relevant notes for the booking..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        
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
                                        <Button type="button" variant="destructive" className="mr-auto"><Trash2 className="h-4 w-4" /></Button>
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
