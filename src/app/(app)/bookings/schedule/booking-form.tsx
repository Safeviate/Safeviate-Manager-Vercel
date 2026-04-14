'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocumentUploader } from '@/components/document-uploader';
import { format, addMinutes, isBefore } from 'date-fns';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking, OverrideLog, TrainingRoute, ChecklistPhoto } from '@/types/booking';
import { Trash2, ShieldAlert, Lock, Eye, MapIcon, ClipboardCheck, Activity, CheckCircle2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import Link from 'next/link';
import { PhotoViewerDialog } from '@/components/photo-viewer-dialog';
import { parseJsonResponse } from '@/lib/safe-json';

const parseLocalDate = (value?: string | null) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day, 12);
};

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
    routeId: z.string().optional(),
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

type BookingDraft = Omit<Booking, 'id' | 'bookingNumber' | 'instructorId' | 'studentId' | 'notes' | 'overnightBookingDate' | 'overnightEndTime' | 'preFlightData' | 'postFlightData' | 'preFlight' | 'postFlight' | 'overrides'> & {
    id?: string;
    bookingNumber?: string;
    navlog?: Booking['navlog'];
    workflowCompletion?: Booking['workflowCompletion'];
    instructorId?: string | null;
    studentId?: string | null;
    notes?: string | null;
    overnightBookingDate?: string | null;
    overnightEndTime?: string | null;
    preFlightData?: (NonNullable<Booking['preFlightData']> & { photos?: ChecklistPhoto[] }) | null;
    postFlightData?: (NonNullable<Booking['postFlightData']> & { photos?: ChecklistPhoto[]; defects: string }) | null;
    preFlight?: boolean;
    postFlight?: boolean;
    overrides?: OverrideLog[];
};

export function BookingForm({ isOpen, setIsOpen, aircraft, startTime, tenantId, pilots, allBookingsForAircraft, existingBooking, refreshBookings }: BookingFormProps) {
    const { toast } = useToast();
    const { hasPermission, isLoading: isPermissionsLoading } = usePermissions();
    const { userProfile } = useUserProfile();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const canEditBooking = hasPermission('bookings-schedule-manage');
    const [preFlight, setPreFlight] = useState(existingBooking?.preFlightData || {
        hobbs: 0,
        tacho: 0,
        fuelUpliftGallons: 0,
        fuelUpliftLitres: 0,
        oilUplift: 0,
        documentsChecked: false,
    });
    const [postFlight, setPostFlight] = useState(existingBooking?.postFlightData || {
        hobbs: 0,
        tacho: 0,
        fuelUpliftGallons: 0,
        fuelUpliftLitres: 0,
        oilUplift: 0,
        defects: existingBooking?.postFlightData?.defects || '',
    });
    const [preFlightPhotos, setPreFlightPhotos] = useState<ChecklistPhoto[]>(((existingBooking?.preFlightData as { photos?: ChecklistPhoto[] } | undefined)?.photos || []) as ChecklistPhoto[]);
    const [postFlightPhotos, setPostFlightPhotos] = useState<ChecklistPhoto[]>(existingBooking?.postFlightData?.photos || []);
    const [requireWeatherPlanningNavlog, setRequireWeatherPlanningNavlog] = useState(!!existingBooking?.workflowCompletion?.weatherPlanningNavlogRequired);

    // Fetch Training Routes
    const [trainingRoutes, setTrainingRoutes] = useState<TrainingRoute[]>([]);
    useEffect(() => {
        let cancelled = false;
        const loadRoutes = async () => {
            if (!tenantId) return;
            const response = await fetch('/api/training-routes', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({ routes: [] }));
            if (!cancelled) {
                setTrainingRoutes((payload.routes ?? []).filter((route: TrainingRoute) => route.routeType !== 'other'));
            }
        };

        void loadRoutes();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    // PERMISSIONS: Can user edit/save?
    const canManageSchedule = canEditBooking;
    const canOverride = hasPermission('bookings-approve-override');
    // LOGIC: A booking is "underway" if it is Approved or tech logs have started
    const isUnderway = existingBooking?.status === 'Approved' || existingBooking?.status === 'Completed' || existingBooking?.preFlight;
    const canEditUnderway = canOverride; // If you have override, you can edit underway bookings
    
    const canDelete = hasPermission('bookings-delete') && (!isUnderway || canOverride);

    const instructors = useMemo(() => pilots.filter(p => p.canBeInstructor || p.userType === 'Instructor'), [pilots]);
    const students = useMemo(() => pilots.filter(p => p.canBeStudent || p.userType === 'Student'), [pilots]);

    const defaultValues = useMemo(() => ({
        type: existingBooking?.type || 'Training Flight',
        date: existingBooking?.date ? parseLocalDate(existingBooking.date) : startTime,
        startTime: existingBooking ? existingBooking.startTime : format(startTime, 'HH:mm'),
        endTime: existingBooking ? existingBooking.endTime : format(addMinutes(startTime, 60), 'HH:mm'),
        instructorId: existingBooking?.instructorId || '',
        studentId: existingBooking?.studentId || '',
        isOvernight: existingBooking?.isOvernight || false,
        overnightBookingDate: parseLocalDate(existingBooking?.overnightBookingDate),
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
            setRequireWeatherPlanningNavlog(!!existingBooking?.workflowCompletion?.weatherPlanningNavlogRequired);
        }
    }, [isOpen, defaultValues, form, existingBooking?.workflowCompletion?.weatherPlanningNavlogRequired]);

    const isOvernight = form.watch('isOvernight');
    const watchStatus = form.watch('status');

    const onSubmit = async (data: z.infer<typeof bookingFormSchema>) => {
        if (!canEditBooking) {
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
        
        const bookingData: BookingDraft = {
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

        // Attach Training Route if selected
        if (data.routeId) {
            const selectedRoute = trainingRoutes.find(r => r.id === data.routeId);
            if (selectedRoute) {
                bookingData.navlog = {
                    legs: selectedRoute.legs,
                    hazards: selectedRoute.hazards,
                    globalTas: 100, // Default TAS
                    globalFuelBurn: 10, // Default burn
                    globalFuelBurnUnit: 'GPH',
                };
            }
        }

        if (data.isOvernight && data.overnightBookingDate) {
            bookingData.overnightBookingDate = format(data.overnightBookingDate, 'yyyy-MM-dd');
            bookingData.overnightEndTime = data.overnightEndTime || null;
        }

        if (data.status === 'Cancelled with Reason') {
            bookingData.notes = `Cancelled: ${data.cancellationReason}\n\n${data.notes || ''}`;
            bookingData.status = 'Cancelled';
        }

        bookingData.preFlightData = {
            ...preFlight,
            fuelUpliftLitres: preFlight.fuelUpliftLitres || 0,
            photos: preFlightPhotos,
        };
        bookingData.postFlightData = {
            ...postFlight,
            defects: postFlight.defects || '',
            fuelUpliftLitres: postFlight.fuelUpliftLitres || 0,
            photos: postFlightPhotos,
        };
        bookingData.preFlight = !!preFlight.documentsChecked || (preFlight.hobbs > 0 || preFlight.tacho > 0);
        bookingData.postFlight = (postFlight.hobbs || 0) > 0;
        bookingData.workflowCompletion = {
            ...(existingBooking?.workflowCompletion || {}),
            weatherPlanningNavlogRequired: requireWeatherPlanningNavlog,
        };

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
            const currentOverrides = Array.isArray(existingBooking?.overrides) ? existingBooking?.overrides : [];
            bookingData.overrides = [...currentOverrides, log];
        }

        try {
            if (existingBooking) {
                await fetch('/api/bookings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking: { ...bookingData, id: existingBooking.id, bookingNumber: existingBooking.bookingNumber } }),
                });
                toast({ title: 'Booking Updated' });
            } else {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking: { ...bookingData, preFlight: false, postFlight: false, createdById: userProfile?.id || null } }),
                });
                const payload = await parseJsonResponse<{ error?: string }>(response);
                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to create booking.');
                }
                toast({ title: 'Booking Created' });
            }
            refreshBookings();
            setIsOpen(false);
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error instanceof Error ? error.message : 'Save failed.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!existingBooking) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/bookings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: existingBooking.id }),
            });
            toast({ title: 'Booking Deleted' });
            refreshBookings();
            setIsOpen(false);
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error instanceof Error ? error.message : 'Delete failed.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const isLocked = isUnderway && !canEditUnderway;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle>{existingBooking ? `Booking #${existingBooking.bookingNumber}` : `New Booking for ${aircraft.tailNumber}`}</DialogTitle>
                    <DialogDescription>
                        {format(startTime, 'PPP')} • Fleet: {aircraft.tailNumber}
                    </DialogDescription>
                </DialogHeader>

                {isLocked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                            <p className="font-bold">Record Locked</p>
                            <p>This flight has been approved or technical logging has started. Basic schedule details cannot be modified by standard users.</p>
                        </div>
                    </div>
                )}

                {!isPermissionsLoading && !canEditBooking && (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4 flex items-start gap-3">
                        <Lock className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                            <p className="font-bold">Read-Only Booking</p>
                            <p>You can view this booking, but you do not have permission to edit the booking details or checks.</p>
                        </div>
                    </div>
                )}

                {canEditUnderway && isUnderway && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-start gap-3">
                        <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800">
                            <p className="font-bold">Override Mode Active</p>
                            <p>You have permission to modify this locked flight record. Use with caution.</p>
                        </div>
                    </div>
                )}

                {!isPermissionsLoading && !canManageSchedule && (
                    <div className="bg-muted border border-border rounded-md p-3 mb-4 flex items-start gap-3">
                        <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                            <p className="font-bold">Read-Only Access</p>
                            <p>You do not have permission to create or modify aircraft bookings. Contact an administrator for access.</p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Booking Type</FormLabel><FormControl><Input placeholder='e.g., Training, Rental' {...field} disabled={isLocked || !canEditBooking} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLocked || !canEditBooking}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Tentative', 'Confirmed', 'Approved', 'Completed', 'Cancelled', 'Cancelled with Reason'].map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>

                        {watchStatus === 'Cancelled with Reason' && (
                            <FormField control={form.control} name="cancellationReason" render={({ field }) => ( <FormItem><FormLabel>Reason for Cancellation</FormLabel><FormControl><Input placeholder='e.g., Weather, Maintenance' {...field} disabled={!canManageSchedule} /></FormControl><FormMessage /></FormItem> )}/>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} disabled={isLocked || !canEditBooking} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} disabled={isLocked || !canEditBooking} /></FormControl><FormMessage /></FormItem> )} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="instructorId" render={({ field }) => ( <FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLocked || !canEditBooking}><FormControl><SelectTrigger><SelectValue placeholder="Select Instructor..." /></SelectTrigger></FormControl><SelectContent>{instructors.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem><FormLabel>Student</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLocked || !canEditBooking}><FormControl><SelectTrigger><SelectValue placeholder="Select Student..." /></SelectTrigger></FormControl><SelectContent>{students.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>

                        {!existingBooking && (
                            <div className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                     <MapIcon className="h-3.5 w-3.5" /> Mission Profile
                                </p>
                                <FormField control={form.control} name="routeId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase">Preset Training Route (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLocked || !canEditBooking}>
                                            <FormControl>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue placeholder="Select a training route to pre-fill navlog..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None / Manual Entry</SelectItem>
                                                {trainingRoutes.map(r => (
                                                    <SelectItem key={r.id} value={r.id}>
                                                        {r.name} ({r.legs.length} Waypoints)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        )}

                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Admin Notes</FormLabel><FormControl><Textarea placeholder="Add any relevant notes..." {...field} disabled={!canEditBooking} /></FormControl><FormMessage /></FormItem> )}/>

                        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Planning Requirement</p>
                                    <p className="text-xs font-semibold text-muted-foreground">Mark whether weather, planning map, and navlog are required for this flight.</p>
                                </div>
                                <Badge variant={requireWeatherPlanningNavlog ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                    {requireWeatherPlanningNavlog ? 'Required' : 'Optional'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-3">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Require Weather / Map / Navlog</p>
                                    <p className="text-[10px] text-muted-foreground">Instructor can only approve after these are completed when enabled.</p>
                                </div>
                                <Switch
                                    checked={requireWeatherPlanningNavlog}
                                    onCheckedChange={setRequireWeatherPlanningNavlog}
                                    disabled={!canEditBooking}
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pre / Post-Flight Checks</p>
                                        <p className="text-xs font-semibold text-muted-foreground">Complete these here in the booking popup.</p>
                                    </div>
                                </div>
                                <Badge variant={(postFlight.hobbs || 0) > 0 ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                    {(postFlight.hobbs || 0) > 0 ? 'Recorded' : 'Pending'}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-3 rounded-lg border bg-background p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Activity className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Pre-flight</p>
                                            <p className="text-[10px] text-muted-foreground">Must be completed before approval.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Hobbs Start</FormLabel>
                                            <Input type="number" step="0.1" value={preFlight.hobbs} onChange={(e) => setPreFlight({ ...preFlight, hobbs: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Tacho Start</FormLabel>
                                            <Input type="number" step="0.1" value={preFlight.tacho} onChange={(e) => setPreFlight({ ...preFlight, tacho: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</FormLabel>
                                            <Input type="number" value={preFlight.fuelUpliftGallons} onChange={(e) => setPreFlight({ ...preFlight, fuelUpliftGallons: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Fuel Uplift (L)</FormLabel>
                                            <Input
                                                type="number"
                                                value={preFlight.fuelUpliftLitres}
                                                onChange={(e) => {
                                                    const litres = parseFloat(e.target.value) || 0;
                                                    setPreFlight({
                                                        ...preFlight,
                                                        fuelUpliftLitres: litres,
                                                        fuelUpliftGallons: Number((litres / 3.785).toFixed(1)),
                                                    });
                                                }}
                                                className="h-9 font-bold"
                                                disabled={!canEditBooking}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</FormLabel>
                                            <Input type="number" value={preFlight.oilUplift} onChange={(e) => setPreFlight({ ...preFlight, oilUplift: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 rounded-lg border p-3">
                                        <Checkbox id="popup-docs" checked={preFlight.documentsChecked} onCheckedChange={(val) => setPreFlight({ ...preFlight, documentsChecked: !!val })} disabled={!canEditBooking} />
                                        <label htmlFor="popup-docs" className="text-[10px] font-black uppercase leading-none cursor-pointer">Documents & License Checked</label>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Photos</p>
                                            <DocumentUploader
                                                defaultFileName="Pre-flight photo"
                                                restrictedMode="camera"
                                                onDocumentUploaded={(photo) => setPreFlightPhotos((current) => [...current, { url: photo.url, description: photo.name }])}
                                                trigger={(open) => (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-[10px] font-black uppercase"
                                                        disabled={!canEditBooking}
                                                        onClick={() => open('camera')}
                                                    >
                                                        Add Photo
                                                    </Button>
                                                )}
                                            />
                                        </div>
                                        {preFlightPhotos.length > 0 && (
                                            <PhotoViewerDialog
                                                title="Pre-flight Photos"
                                                photos={preFlightPhotos.map((photo) => ({ url: photo.url, name: photo.description }))}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3 rounded-lg border bg-background p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Post-flight</p>
                                            <p className="text-[10px] text-muted-foreground">Complete this last after the flight.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Hobbs End</FormLabel>
                                            <Input type="number" step="0.1" value={postFlight.hobbs} onChange={(e) => setPostFlight({ ...postFlight, hobbs: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Tacho End</FormLabel>
                                            <Input type="number" step="0.1" value={postFlight.tacho} onChange={(e) => setPostFlight({ ...postFlight, tacho: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</FormLabel>
                                            <Input
                                                type="number"
                                                value={postFlight.fuelUpliftGallons}
                                                onChange={(e) => {
                                                    const gallons = parseFloat(e.target.value) || 0;
                                                    setPostFlight({
                                                        ...postFlight,
                                                        fuelUpliftGallons: gallons,
                                                        fuelUpliftLitres: Number((gallons * 3.785).toFixed(1)),
                                                    });
                                                }}
                                                className="h-9 font-bold"
                                                disabled={!canEditBooking}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Fuel Uplift (L)</FormLabel>
                                            <Input
                                                type="number"
                                                value={postFlight.fuelUpliftLitres}
                                                onChange={(e) => {
                                                    const litres = parseFloat(e.target.value) || 0;
                                                    setPostFlight({
                                                        ...postFlight,
                                                        fuelUpliftLitres: litres,
                                                        fuelUpliftGallons: Number((litres / 3.785).toFixed(1)),
                                                    });
                                                }}
                                                className="h-9 font-bold"
                                                disabled={!canEditBooking}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</FormLabel>
                                            <Input type="number" value={postFlight.oilUplift} onChange={(e) => setPostFlight({ ...postFlight, oilUplift: parseFloat(e.target.value) || 0 })} className="h-9 font-bold" disabled={!canEditBooking} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Photos</p>
                                            <DocumentUploader
                                                defaultFileName="Post-flight photo"
                                                restrictedMode="camera"
                                                onDocumentUploaded={(photo) => setPostFlightPhotos((current) => [...current, { url: photo.url, description: photo.name }])}
                                                trigger={(open) => (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-[10px] font-black uppercase"
                                                        disabled={!canEditBooking}
                                                        onClick={() => open('camera')}
                                                    >
                                                        Add Photo
                                                    </Button>
                                                )}
                                            />
                                        </div>
                                        {postFlightPhotos.length > 0 && (
                                            <PhotoViewerDialog
                                                title="Post-flight Photos"
                                                photos={postFlightPhotos.map((photo) => ({ url: photo.url, name: photo.description }))}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <FormField control={form.control} name="isOvernight" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} id="isOvernight" disabled={isLocked || !canEditBooking} /></FormControl><FormLabel htmlFor="isOvernight">Overnight Booking</FormLabel></FormItem> )}/>
                        </div>

                        {isOvernight && (
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                                <FormField control={form.control} name="overnightBookingDate" render={({ field }) => ( <FormItem><FormLabel>Return Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(parseLocalDate(e.target.value))} disabled={isLocked || !canEditBooking} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="overnightEndTime" render={({ field }) => ( <FormItem><FormLabel>Return Time</FormLabel><FormControl><Input type="time" {...field} disabled={isLocked || !canEditBooking} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                        )}

                        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2">
                            {existingBooking && canDelete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" className="mr-auto"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete booking #{existingBooking.bookingNumber}.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            
                            {existingBooking && (
                                <Button variant="outline" size="sm" asChild className="h-10 gap-2 ml-auto sm:ml-0">
                                    <Link href={`/bookings/history/${existingBooking.id}`}>
                                        <Eye className="h-4 w-4" /> View
                                    </Link>
                                </Button>
                            )}

                            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                                <DialogClose asChild><Button type="button" variant="outline" className="flex-1 sm:flex-none">Cancel</Button></DialogClose>
                                {canManageSchedule && !isLocked && (
                                    <Button type="submit" disabled={isSubmitting || !canEditBooking} className="flex-1 sm:flex-none">
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
