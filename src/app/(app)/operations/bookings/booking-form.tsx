'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { format, addMinutes, isBefore } from 'date-fns';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking, OverrideLog } from '@/types/booking';
import { Trash2, Lock, ShieldAlert, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import Link from 'next/link';

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
    status: z.enum(['Tentative', 'Confirmed', 'Approved', 'Completed', 'Cancelled', 'Cancelled with Reason']).default('Confirmed'),
    cancellationReason: z.string().optional(),
})
.refine(data => {
    const start = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
    const end = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`);
    return isBefore(start, end);
}, {
    message: "End time must be after start time",
    path: ["endTime"],
});

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
    const { hasPermission } = usePermissions();
    const { userProfile } = useUserProfile();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // PERMISSIONS
    const canManageSchedule = hasPermission('bookings-schedule-manage');
    const canOverride = hasPermission('bookings-approve-override');
    const canDelete = hasPermission('bookings-delete');

    // LOGIC: A booking is "underway" if it is Approved or tech logs have started
    const isUnderway = existingBooking?.status === 'Approved' || existingBooking?.status === 'Completed' || existingBooking?.preFlight;
    const canEditUnderway = canOverride;

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
        status: existingBooking?.status || 'Confirmed',
        cancellationReason: '',
    }), [existingBooking, startTime]);
    
    const form = useForm<z.infer<typeof bookingFormSchema>>({
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

    const onSubmit = async (data: z.infer<typeof bookingFormSchema>) => {
        if (!firestore) return;
        if (!canManageSchedule) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to manage the schedule.' });
            return;
        }
        setIsSubmitting(true);

        const startIso = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`).toISOString();
        const endIso = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`).toISOString();

        const newStart = new Date(startIso);
        const newEnd = new Date(endIso);

        // VALIDATION: Cannot book in the past
        if (!existingBooking && isBefore(newStart, new Date())) {
            toast({
                variant: 'destructive',
                title: 'Invalid Time',
                description: 'You cannot create a booking in the past.',
            });
            setIsSubmitting(false);
            return;
        }

        // VALIDATION: Check for schedule overlaps
        const hasOverlap = allBookingsForAircraft.some(other => {
            if (other.id === existingBooking?.id) return false;
            if (other.status === 'Cancelled' || other.status === 'Cancelled with Reason') return false;
            
            const otherStart = new Date(other.start);
            const otherEnd = new Date(other.end);
            
            return newStart < otherEnd && newEnd > otherStart;
        });

        if (hasOverlap) {
            toast({
                variant: 'destructive',
                title: 'Schedule Conflict',
                description: 'The booking period overlaps with an existing flight for this aircraft. Please adjust the times.',
            });
            setIsSubmitting(false);
            return;
        }
        
        const bookingData: any = {
            aircraftId: aircraft.id,
            type: data.type,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: data.startTime,
            endTime: data.endTime,
            start: startIso,
            end: endIso,
            instructorId: data.instructorId || null,
            studentId: data.studentId || null,
            status: data.status,
            notes: data.notes || null,
            isOvernight: data.isOvernight,
        };

        if (data.isOvernight && data.overnightBookingDate) {
            bookingData.overnightBookingDate = format(data.overnightBookingDate, 'yyyy-MM-dd');
            bookingData.overnightEndTime = data.overnightEndTime || null;
        }

        if (data.status === 'Cancelled with Reason') {
            bookingData.notes = `Cancelled: ${data.cancellationReason}\n\n${data.notes || ''}`;
            bookingData.status = 'Cancelled';
        }

        // Audit Admin/Locked Record Override
        if (existingBooking && isUnderway && canEditUnderway && userProfile) {
            const reason = window.prompt("This booking is locked (underway or approved). Please provide a reason for modifying the schedule details:");
            if (!reason) {
                toast({ variant: 'destructive', title: 'Save Cancelled', description: 'A reason is required to override locked records.' });
                setIsSubmitting(false);
                return;
            }
            const log: OverrideLog = {
                userId: userProfile.id,
                userName: `${userProfile.firstName} ${userProfile.lastName}`,
                permissionId: 'bookings-approve-override',
                action: 'Modified schedule details of a locked/underway record',
                reason: reason,
                timestamp: new Date().toISOString()
            };
            bookingData.overrides = arrayUnion(log);
        }

        try {
            if (existingBooking) {
                const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, existingBooking.id);
                updateDocumentNonBlocking(bookingRef, bookingData);
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
                        preFlight: false,
                        postFlight: false,
                        createdById: userProfile?.id || null,
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle>{existingBooking ? `Booking #${existingBooking.bookingNumber}` : `New Booking for ${aircraft.tailNumber}`}</DialogTitle>
                    <DialogTitle className="sr-only">Edit Booking Details</DialogTitle>
                    <DialogDescription>
                        {format(startTime, 'PPP')} • Fleet: {aircraft.tailNumber}
                    </DialogDescription>
                </DialogHeader>

                {isUnderway && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                            <p className="font-bold">Record Locked</p>
                            <p>This flight has been approved or technical logging has started. Basic schedule details cannot be modified.</p>
                        </div>
                    </div>
                )}

                {!canManageSchedule && (
                    <div className="bg-muted border border-border rounded-md p-3 mb-4 flex items-start gap-3">
                        <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                            <p className="font-bold">Read-Only Access</p>
                            <p>You do not have permission to manage aircraft bookings. Contact an administrator for access.</p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Booking Type</FormLabel><FormControl><Input placeholder='e.g., Training, Rental' {...field} disabled={isUnderway || !canManageSchedule} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isUnderway || !canManageSchedule}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Tentative', 'Confirmed', 'Approved', 'Completed', 'Cancelled', 'Cancelled with Reason'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>

                        {watchStatus === 'Cancelled with Reason' && (
                            <FormField control={form.control} name="cancellationReason" render={({ field }) => ( <FormItem><FormLabel>Reason for Cancellation</FormLabel><FormControl><Input placeholder='e.g., Weather, Maintenance' {...field} disabled={!canManageSchedule} /></FormControl><FormMessage /></FormItem> )}/>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} disabled={isUnderway || !canManageSchedule} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} disabled={isUnderway || !canManageSchedule} /></FormControl><FormMessage /></FormItem> )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="instructorId" render={({ field }) => ( <FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUnderway || !canManageSchedule}><FormControl><SelectTrigger><SelectValue placeholder="Select Instructor..." /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUnderway || !canManageSchedule}><FormControl><SelectTrigger><SelectValue placeholder="Select Student..." /></SelectTrigger></FormControl><SelectContent>{students.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>

                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Admin Notes</FormLabel><FormControl><Textarea placeholder="Add any relevant notes..." {...field} disabled={!canManageSchedule} /></FormControl><FormMessage /></FormItem> )}/>
                        
                        <div className="flex items-center space-x-2">
                            <FormField control={form.control} name="isOvernight" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} id="isOvernight" disabled={isUnderway || !canManageSchedule} /></FormControl><FormLabel htmlFor="isOvernight">Overnight Booking</FormLabel></FormItem> )}/>
                        </div>

                        {isOvernight && (
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                                <FormField control={form.control} name="overnightBookingDate" render={({ field }) => ( <FormItem><FormLabel>Return Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} disabled={isUnderway || !canManageSchedule} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="overnightEndTime" render={({ field }) => ( <FormItem><FormLabel>Return Time</FormLabel><FormControl><Input type="time" {...field} disabled={isUnderway || !canManageSchedule} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                        )}

                        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2">
                            {existingBooking && canDelete && !isUnderway && (
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

                            {existingBooking && (
                                <Button variant="outline" size="sm" asChild className="h-8 gap-2 ml-auto sm:ml-0">
                                    <Link href={`/operations/booking-history/${existingBooking.id}`}>
                                        <Eye className="h-4 w-4" /> View
                                    </Link>
                                </Button>
                            )}

                            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                                <DialogClose asChild><Button type="button" variant="outline" className="flex-1 sm:flex-none">Cancel</Button></DialogClose>
                                {canManageSchedule && !isUnderway && (
                                    <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                                        {isSubmitting ? 'Saving...' : 'Save Booking'}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
