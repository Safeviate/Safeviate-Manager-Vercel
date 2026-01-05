
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBooking, updateBooking, deleteBooking, cancelBooking } from './booking-functions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, Trash2, Scale, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMinutes, set } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

import type { Aircraft } from '../../assets/page';
import type { PilotProfile, Personnel } from '../../users/personnel/page';
import type { Booking, MassAndBalance } from '@/types/booking';

import { PreFlightChecklistDialog } from './pre-flight-checklist-dialog';
import { PostFlightChecklistDialog } from './post-flight-checklist-dialog';
import { MassBalanceCalculator } from './mass-balance-calculator';

const bookingSchema = z.object({
    type: z.enum(['Training Flight', 'Private Flight', 'Reposition Flight', 'Maintenance Flight']),
    studentId: z.string().optional(),
    instructorId: z.string().optional(),
    privatePilotId: z.string().optional(),
    date: z.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid HH:mm format"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid HH:mm format"),
    isOvernight: z.boolean().default(false),
    overnightBookingDate: z.date().optional(),
    overnightEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid HH:mm format").optional(),
    massAndBalance: z.any().optional(), // We'll handle this separately
}).refine(data => {
    if (data.type === 'Training Flight') {
        return !!data.studentId && !!data.instructorId;
    }
    if (data.type === 'Private Flight') {
        return !!data.privatePilotId;
    }
    return true;
}, {
    message: "A pilot is required for this flight type.",
    path: ["privatePilotId"], // Associate the error with a field
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    aircraft: Aircraft;
    startTime: Date;
    tenantId: string;
    pilots: (PilotProfile | Personnel)[];
    allBookingsForAircraft: Booking[];
    existingBooking?: Booking | null;
    refreshBookings: () => void;
}

export function BookingForm({
    isOpen,
    setIsOpen,
    aircraft,
    startTime,
    tenantId,
    pilots,
    allBookingsForAircraft,
    existingBooking,
    refreshBookings,
}: BookingFormProps) {
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    
    const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
    const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);
    const [isMassBalanceOpen, setIsMassBalanceOpen] = useState(false);

    const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor') as PilotProfile[], [pilots]);
    const students = useMemo(() => pilots.filter(p => p.userType === 'Student') as PilotProfile[], [pilots]);
    const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot') as PilotProfile[], [pilots]);

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
    });
    
    useEffect(() => {
        if (isOpen) {
            form.reset({
                type: existingBooking?.type || 'Training Flight',
                studentId: existingBooking?.studentId || '',
                instructorId: existingBooking?.instructorId || '',
                privatePilotId: existingBooking?.privatePilotId || '',
                date: existingBooking ? new Date(existingBooking.date) : new Date(startTime),
                startTime: existingBooking?.startTime || format(startTime, 'HH:mm'),
                endTime: existingBooking?.endTime || format(addMinutes(startTime, 120), 'HH:mm'),
                isOvernight: existingBooking?.isOvernight || false,
                overnightBookingDate: existingBooking?.overnightBookingDate ? new Date(existingBooking.overnightBookingDate) : undefined,
                overnightEndTime: existingBooking?.overnightEndTime || '09:00',
                massAndBalance: existingBooking?.massAndBalance || null,
            });
        }
    }, [isOpen, existingBooking, startTime, form]);

    const onSubmit = async (data: BookingFormValues) => {
        if (!firestore || !authUser) return;

        const bookingPayload = {
            ...data,
            aircraftId: aircraft.id,
            date: format(data.date, 'yyyy-MM-dd'),
            overnightBookingDate: data.isOvernight && data.overnightBookingDate ? format(data.overnightBookingDate, 'yyyy-MM-dd') : null,
            createdById: existingBooking?.createdById || authUser.uid,
            massAndBalance: form.getValues('massAndBalance'),
        };

        try {
            if (existingBooking) {
                await updateBooking({ firestore, tenantId, bookingId: existingBooking.id, updateData: bookingPayload, aircraft });
                toast({ title: 'Booking Updated', description: 'The booking details have been saved.' });
            } else {
                await createBooking(firestore, tenantId, bookingPayload);
                toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
            }
            refreshBookings();
            setIsOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };
    
    const handleDelete = async () => {
        if (!firestore || !existingBooking) return;
        try {
            await deleteBooking(firestore, tenantId, existingBooking.id);
            toast({ title: 'Booking Deleted' });
            refreshBookings();
            setIsDeleteDialogOpen(false);
            setIsOpen(false);
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    }
    
    const handleCancelBooking = async () => {
        if (!firestore || !existingBooking) return;
        try {
            await cancelBooking(firestore, tenantId, existingBooking.id, cancellationReason);
            toast({ title: 'Booking Cancelled'});
            refreshBookings();
            setIsCancelDialogOpen(false);
            setIsOpen(false);
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
        }
    }
    
    const handleMassBalanceSave = (mbData: MassAndBalance) => {
        form.setValue('massAndBalance', mbData, { shouldValidate: true });
        setIsMassBalanceOpen(false);
        toast({ title: "Mass & Balance Saved", description: "W&B data is staged to be saved with the booking." });
    };

    const bookingType = form.watch('type');
    const isOvernight = form.watch('isOvernight');

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{existingBooking ? `Edit Booking #${existingBooking.bookingNumber}` : 'New Booking'}</DialogTitle>
                        <DialogDescription>For aircraft {aircraft.tailNumber} on {format(startTime, 'PPP')}</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Training Flight">Training Flight</SelectItem><SelectItem value="Private Flight">Private Flight</SelectItem><SelectItem value="Reposition Flight">Reposition Flight</SelectItem><SelectItem value="Maintenance Flight">Maintenance Flight</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                            {bookingType === 'Training Flight' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger></FormControl><SelectContent>{students.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="instructorId" render={({ field }) => ( <FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select instructor..." /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                </div>
                            )}
                            {bookingType === 'Private Flight' && (
                                <FormField control={form.control} name="privatePilotId" render={({ field }) => ( <FormItem><FormLabel>Pilot</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select pilot..." /></SelectTrigger></FormControl><SelectContent>{privatePilots.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            )}
                             <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name="isOvernight" render={({ field }) => ( <FormItem className="flex items-center gap-2 pt-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Overnight?</FormLabel></FormItem> )} />
                            {isOvernight && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="overnightBookingDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Return Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="overnightEndTime" render={({ field }) => ( <FormItem><FormLabel>Return Time</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                            )}
                             <DialogFooter className="pt-4 flex-wrap gap-2">
                                {existingBooking && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsPreFlightOpen(true)} disabled={!!existingBooking.postFlight}>Pre-Flight</Button>
                                        <Button type="button" variant="outline" onClick={() => setIsPostFlightOpen(true)} disabled={!existingBooking.preFlight}>Post-Flight</Button>
                                        <Button type="button" variant="outline" onClick={() => setIsMassBalanceOpen(true)}><Scale className="mr-2" /> W&B</Button>
                                        <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>Delete</Button>
                                        <Button type="button" variant="secondary" onClick={() => setIsCancelDialogOpen(true)}>Cancel Booking</Button>
                                    </div>
                                )}
                                <div className="flex-grow"></div>
                                <Button type="submit">{existingBooking ? 'Save Changes' : 'Create Booking'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Other Dialogs */}
            {existingBooking && (
                <>
                    <PreFlightChecklistDialog isOpen={isPreFlightOpen} setIsOpen={setIsPreFlightOpen} booking={existingBooking} aircraft={aircraft} tenantId={tenantId} onChecklistSubmitted={refreshBookings} />
                    <PostFlightChecklistDialog isOpen={isPostFlightOpen} setIsOpen={setIsPostFlightOpen} booking={existingBooking} aircraft={aircraft} tenantId={tenantId} onChecklistSubmitted={refreshBookings} />
                     <Dialog open={isMassBalanceOpen} onOpenChange={setIsMassBalanceOpen}>
                        <DialogContent className="max-w-7xl h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Mass &amp; Balance Calculator</DialogTitle>
                                <DialogDescription>
                                    Calculate the weight and balance for this specific flight.
                                </DialogDescription>
                            </DialogHeader>
                            <MassBalanceCalculator
                                aircraft={aircraft}
                                initialData={form.getValues('massAndBalance')}
                                onSave={handleMassBalanceSave}
                            />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Booking?</AlertDialogTitle><AlertDialogDescription>This will permanently delete booking #{existingBooking.bookingNumber}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                        <DialogContent><DialogHeader><DialogTitle>Cancel Booking</DialogTitle><DialogDescription>Reason for cancellation (optional)</DialogDescription></DialogHeader><Input value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} /><DialogFooter><DialogClose asChild><Button variant="outline">Back</Button></DialogClose><Button variant="destructive" onClick={handleCancelBooking}>Confirm Cancellation</Button></DialogFooter></DialogContent>
                    </Dialog>
                </>
            )}
        </>
    );
}
