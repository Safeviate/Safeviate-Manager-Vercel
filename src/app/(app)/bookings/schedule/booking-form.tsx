'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { format, addMinutes, isBefore } from 'date-fns';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import { Trash2, FileClock, ClipboardCheck, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePermissions } from '@/hooks/use-permissions';

type FormView = 'details' | 'pre-flight' | 'post-flight';

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState<FormView>('details');

    const canPreflight = hasPermission('bookings-preflight-manage');
    const canPostflight = hasPermission('bookings-postflight-manage');
    const canDelete = hasPermission('bookings-delete');

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
            setView('details');
        }
    }, [isOpen, defaultValues, form]);

    const isOvernight = form.watch('isOvernight');
    const watchStatus = form.watch('status');

    const onSubmit = async (data: z.infer<typeof bookingFormSchema>) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <div className="flex flex-col gap-1">
                        <DialogTitle>{existingBooking ? `Booking #${existingBooking.bookingNumber}` : `New Booking for ${aircraft.tailNumber}`}</DialogTitle>
                        <DialogDescription>
                            {format(startTime, 'PPP')} • Current Aircraft Hobbs: {aircraft.currentHobbs || 0}
                        </DialogDescription>
                    </div>
                    {existingBooking && (
                        <div className="flex items-center gap-2 mt-4 no-print">
                            <Button 
                                variant={view === 'details' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setView('details')}
                                className="flex-1 gap-2"
                            >
                                <Info className="h-4 w-4" /> Booking Details
                            </Button>
                            <Button 
                                variant={view === 'pre-flight' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setView('pre-flight')}
                                className="flex-1 gap-2"
                                disabled={!canPreflight}
                            >
                                <ClipboardCheck className="h-4 w-4" /> Pre-Flight
                            </Button>
                            <Button 
                                variant={view === 'post-flight' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setView('post-flight')}
                                className="flex-1 gap-2"
                                disabled={!existingBooking.preFlight || !canPostflight}
                            >
                                <FileClock className="h-4 w-4" /> Post-Flight
                            </Button>
                        </div>
                    )}
                </DialogHeader>

                {view === 'details' && (
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
                                {existingBooking && canDelete && (
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
                )}

                {view === 'pre-flight' && existingBooking && (
                    <PreFlightForm 
                        booking={existingBooking} 
                        aircraft={aircraft} 
                        tenantId={tenantId}
                        onSave={() => { setView('details'); refreshBookings(); }}
                    />
                )}

                {view === 'post-flight' && existingBooking && (
                    <PostFlightForm 
                        booking={existingBooking} 
                        aircraft={aircraft} 
                        tenantId={tenantId}
                        onSave={() => { setView('details'); refreshBookings(); }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function PreFlightForm({ booking, aircraft, tenantId, onSave }: { booking: Booking, aircraft: Aircraft, tenantId: string, onSave: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: booking.preFlightData || {
            hobbs: aircraft.currentHobbs || 0,
            tacho: aircraft.currentTacho || 0,
            fuelOnBoard: 0,
            oilUplift: 0,
            documentsChecked: true,
        }
    });

    const handleSave = async (data: any) => {
        if (!firestore) return;
        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, {
            preFlight: true,
            preFlightData: data,
        });
        toast({ title: 'Pre-Flight Saved' });
        onSave();
        setIsSaving(false);
    }

    return (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                <div className="space-y-2">
                    <Label>Start Hobbs</Label>
                    <Input type="number" step="0.1" {...form.register('hobbs', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                    <Label>Start Tacho</Label>
                    <Input type="number" step="0.1" {...form.register('tacho', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                    <Label>Fuel On Board (Gal)</Label>
                    <Input type="number" {...form.register('fuelOnBoard', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                    <Label>Oil Uplift (Qts)</Label>
                    <Input type="number" step="0.5" {...form.register('oilUplift', { valueAsNumber: true })} />
                </div>
                <div className="col-span-full flex items-center space-x-2 pt-2">
                    <Switch checked={form.watch('documentsChecked')} onCheckedChange={(val) => form.setValue('documentsChecked', val)} />
                    <Label>Aircraft Documents Checked</Label>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSave}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>Record Pre-Flight</Button>
            </div>
        </form>
    )
}

function PostFlightForm({ booking, aircraft, tenantId, onSave }: { booking: Booking, aircraft: Aircraft, tenantId: string, onSave: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: booking.postFlightData || {
            hobbs: (booking.preFlightData?.hobbs || aircraft.currentHobbs || 0) + 1,
            tacho: (booking.preFlightData?.tacho || aircraft.currentTacho || 0) + 0.8,
            fuelRemaining: 0,
            defects: '',
        }
    });

    const handleSave = async (data: any) => {
        if (!firestore) return;
        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);

        updateDocumentNonBlocking(bookingRef, {
            postFlight: true,
            postFlightData: data,
            status: 'Completed'
        });

        // Also update aircraft totals
        updateDocumentNonBlocking(aircraftRef, {
            currentHobbs: data.hobbs,
            currentTacho: data.tacho,
        });

        toast({ title: 'Flight Finalized', description: 'Flight record completed and aircraft hours updated.' });
        onSave();
        setIsSaving(false);
    }

    return (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                <div className="space-y-2">
                    <Label>End Hobbs</Label>
                    <Input type="number" step="0.1" {...form.register('hobbs', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                    <Label>End Tacho</Label>
                    <Input type="number" step="0.1" {...form.register('tacho', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                    <Label>Fuel Remaining (Gal)</Label>
                    <Input type="number" {...form.register('fuelRemaining', { valueAsNumber: true })} />
                </div>
                <div className="col-span-full space-y-2">
                    <Label>Defects / Observations</Label>
                    <Textarea placeholder="Describe any technical issues or observations..." {...form.register('defects')} />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onSave}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>Finalize Flight</Button>
            </div>
        </form>
    )
}
