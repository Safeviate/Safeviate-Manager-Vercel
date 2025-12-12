
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogContent,
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
import { deleteBookings, getNextBookingNumber } from './booking-functions';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown } from 'lucide-react';
import type { ChecklistResponse, ChecklistItemResponse } from '@/types/checklist';

interface BookingFormProps {
  tenantId: string;
  aircraftList: Aircraft[];
  pilotList: PilotProfile[];
  allBookings: Booking[];
  initialData: {
    aircraft: Aircraft;
    time: string;
    date: Date;
    booking?: Booking;
  } | null;
  isOpen: boolean;
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

const requiredAircraftDocuments = [
    'Certificate of Release to service',
    'Certificate of Registration',
    'Certificate of Airworthiness',
    'Radio',
    'Insurance',
];

export function BookingForm({ tenantId, aircraftList, pilotList, allBookings, initialData, isOpen, onClose }: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!initialData?.booking;

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Checklist State
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isChecklistOpen, setIsChecklistOpen] = useState(true);
  const [checklistType, setChecklistType] = useState<'pre-flight' | 'post-flight'>('pre-flight');

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
  });

  useEffect(() => {
    if (initialData) {
      const isEditMode = !!initialData.booking;
      const isOvernightBooking = !!initialData.booking?.overnightId;

      let defaultValues: BookingFormValues;

      if (isEditMode && isOvernightBooking) {
        const currentPart = initialData.booking!;
        const otherPart = allBookings.find(b => b.overnightId === currentPart.overnightId && b.id !== currentPart.id);
        
        let day1Part: Booking, day2Part: Booking;
        if (otherPart && isBefore(currentPart.startTime.toDate(), otherPart.startTime.toDate())) {
            day1Part = currentPart; day2Part = otherPart;
        } else if (otherPart) {
            day1Part = otherPart; day2Part = currentPart;
        } else {
            const sortedParts = allBookings.filter(b => b.overnightId === currentPart.overnightId).sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis());
            day1Part = sortedParts[0]; day2Part = sortedParts[1];
        }

        defaultValues = {
            aircraftId: initialData.aircraft.id,
            pilotId: day1Part?.pilotId || currentPart.pilotId,
            instructorId: day1Part?.instructorId || currentPart.instructorId || '',
            type: day1Part?.type || currentPart.type,
            startTime: day1Part ? format(day1Part.startTime.toDate(), 'HH:mm') : '00:00',
            endTime: '23:59', // Day 1 always ends at midnight
            status: currentPart.status,
            isOvernight: true,
            overnightEndTime: day2Part ? format(day2Part.endTime.toDate(), 'HH:mm') : '08:00',
            cancellationReason: currentPart.cancellationReason || day2Part?.cancellationReason || '',
        };
      } else {
        defaultValues = {
            aircraftId: initialData.aircraft.id,
            pilotId: initialData.booking?.pilotId || '',
            instructorId: initialData.booking?.instructorId || '',
            type: initialData.booking?.type || 'Student Training',
            startTime: initialData.booking ? format(initialData.booking.startTime.toDate(), 'HH:mm') : initialData.time,
            endTime: initialData.booking ? format(initialData.booking.endTime.toDate(), 'HH:mm') : format(addHours(new Date(`1970-01-01T${initialData.time}`), 2), 'HH:mm'),
            status: initialData.booking?.status || 'Confirmed',
            isOvernight: false,
            overnightEndTime: '08:00',
            cancellationReason: initialData.booking?.cancellationReason || '',
        };
      }
      form.reset(defaultValues);
    }
  }, [initialData, form, allBookings]);
  
  const isOvernight = form.watch('isOvernight');

  useEffect(() => {
    if (isOvernight && !isEditing) {
        form.setValue('endTime', '23:59');
    }
  }, [isOvernight, form, isEditing]);

  const allChecklistDocs = useMemo(() => {
    if (!initialData?.aircraft) return [];
    return Array.from(new Set([...requiredAircraftDocuments, ...(initialData.aircraft.documents?.map(d => d.name) || [])]));
  }, [initialData?.aircraft]);

  const handleCheckboxChange = (itemName: string, isChecked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemName]: isChecked }));
  };

  const saveChecklist = (bookingId: string, pilotId: string) => {
    if (!firestore || Object.keys(checkedItems).length === 0) return;

    const responses: ChecklistItemResponse[] = Object.entries(checkedItems).map(([itemId, checked]) => ({
        itemId,
        checked,
        notes: '', // For future use
        photoUrl: '', // For future use
    }));

    const checklistResponse: Omit<ChecklistResponse, 'id'> = {
        bookingId,
        pilotId,
        checklistType,
        submissionTime: Timestamp.now(),
        responses,
    };
    
    const checklistRef = collection(firestore, 'tenants', tenantId, 'checklistResponses');
    addDocumentNonBlocking(checklistRef, checklistResponse);

    toast({ title: `Checklist Saved`, description: `${checklistType === 'pre-flight' ? 'Pre-flight' : 'Post-flight'} checklist has been submitted.` });
  };


  const onSubmit = async (data: BookingFormValues) => {
    if (!firestore || !initialData) return;

    if (isEditing && initialData.booking) {
      if (initialData.booking.overnightId) {
        await handleOvernightUpdate(data, initialData.booking.overnightId);
      } else {
        await handleStandardBooking(data, initialData.booking.id, initialData.booking?.bookingNumber);
      }
      // Save checklist if editing
      saveChecklist(initialData.booking.id, data.pilotId);
    } else {
      try {
        const bookingNumber = await getNextBookingNumber(firestore, tenantId, 'bookings');
        if (data.isOvernight) {
          handleOvernightBooking(data, bookingNumber);
        } else {
          const newBookingId = await handleStandardBooking(data, undefined, bookingNumber);
          if (newBookingId) {
            saveChecklist(newBookingId, data.pilotId);
          }
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: 'Could not generate a booking number. Please try again.',
        });
        return;
      }
    }
    onClose();
  };
  
  const handleStandardBooking = async (data: BookingFormValues, existingId?: string, bookingNumber?: number): Promise<string | undefined> => {
    if (!initialData) return;
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

    if (existingId) {
      const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', existingId);
      updateDocumentNonBlocking(bookingRef, bookingData);
      toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
      return existingId;
    } else {
      const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
      const newDocRef = await addDocumentNonBlocking(bookingsRef, bookingData);
      toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
      return newDocRef?.id;
    }
  }

  const handleOvernightBooking = (data: BookingFormValues, bookingNumber: number) => {
    if (!initialData) return;
    const overnightId = uuidv4();
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const startTime = setMinutes(setHours(initialData.date, startHour), startMinute);
    const endTime = endOfDay(initialData.date);

    const bookingData1: Partial<Booking> = {
        ...data,
        bookingNumber,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        overnightId: overnightId,
    };
    delete (bookingData1 as any).isOvernight;
    delete (bookingData1 as any).overnightEndTime;

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

    const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
    addDocumentNonBlocking(bookingsRef, bookingData1).then(docRef => {
      if (docRef) saveChecklist(docRef.id, data.pilotId);
    });
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
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not find the overnight booking parts to update.' });
      return;
    }
  
    const day1Part = bookingsToUpdate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())[0];
    const day2Part = bookingsToUpdate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())[1];
  
    if (!day1Part || !day2Part) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not identify both parts of the overnight booking.' });
        return;
    }

    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const newDay1StartTime = setMinutes(setHours(day1Part.startTime.toDate(), startHour), startMinute);
    const day1BookingData: Partial<Booking> = {
        ...data,
        startTime: Timestamp.fromDate(newDay1StartTime),
        endTime: Timestamp.fromDate(endOfDay(day1Part.startTime.toDate())),
    };
    delete (day1BookingData as any).isOvernight;
    delete (day1BookingData as any).overnightEndTime;

    const [endHour, endMinute] = (data.overnightEndTime || "00:00").split(':').map(Number);
    const newDay2EndTime = setMinutes(setHours(day2Part.startTime.toDate(), endHour), endMinute);
    const day2BookingData: Partial<Booking> = {
        ...data,
        startTime: Timestamp.fromDate(startOfDay(day2Part.startTime.toDate())),
        endTime: Timestamp.fromDate(newDay2EndTime),
    };
    delete (day2BookingData as any).isOvernight;
    delete (day2BookingData as any).overnightEndTime;
  
    const day1Ref = doc(firestore, 'tenants', tenantId, 'bookings', day1Part.id);
    const day2Ref = doc(firestore, 'tenants', tenantId, 'bookings', day2Part.id);
  
    updateDocumentNonBlocking(day1Ref, day1BookingData);
    updateDocumentNonBlocking(day2Ref, day2BookingData);

    toast({ title: 'Overnight Booking Updated', description: 'The booking details have been updated across both days.' });
  };

  const handleCancelBooking = () => {
    if (!isEditing || !firestore || !initialData?.booking) return;

    if (!cancellationReason.trim()) {
        toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for the cancellation.' });
        return;
    }

    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking.id);
    updateDocumentNonBlocking(bookingRef, { status: 'Cancelled with Reason', cancellationReason: cancellationReason });
    
    toast({ title: 'Booking Cancelled', description: 'The booking has been marked as cancelled with a reason.' });

    setIsCancelDialogOpen(false);
    setCancellationReason('');
    onClose();
  };

  const handleDeleteBooking = async () => {
    if (!isEditing || !firestore || !initialData?.booking) return;

    try {
        let docsToDelete: any[] = [];
        if (initialData.booking.overnightId) {
            const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
            const q = query(bookingsRef, where('overnightId', '==', initialData.booking.overnightId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                docsToDelete.push(doc.ref);
            });
        } else {
            docsToDelete.push(doc(firestore, 'tenants', tenantId, 'bookings', initialData.booking.id));
        }

        if (docsToDelete.length > 0) {
            await deleteBookings(firestore, tenantId, docsToDelete);
            toast({ title: 'Booking Deleted', description: 'The booking has been permanently deleted.' });
        }
    } catch (error) {
        console.error("Error deleting booking(s):", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the booking(s)." });
    }
    
    onClose();
  }

  const triggerCancelDialog = () => {
    onClose(); // Close the edit dialog
    setIsCancelDialogOpen(true); // Open the cancel dialog
  };

  const triggerDeleteDialog = () => {
    onClose(); // Close the edit dialog
    setIsDeleteDialogOpen(true); // Open the delete dialog
  };
  
  if (!initialData) return null;

  return (
    <>
      {/* Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Booking' : 'Create Booking'}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Editing booking #${initialData.booking?.bookingNumber} for ${initialData.aircraft.tailNumber}` : `New booking for ${initialData.aircraft.tailNumber} on ${format(initialData.date, 'PPP')}`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <ScrollArea className="max-h-[60vh]">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
                <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex w-full items-center justify-between px-1">
                          <h3 className="text-lg font-semibold">Booking Details</h3>
                          <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                  </CollapsibleContent>
                </Collapsible>
                
                {isEditing && (
                    <>
                        <Separator />
                        <Collapsible open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="flex w-full items-center justify-between px-1">
                                    <h3 className="text-lg font-semibold capitalize">{checklistType.replace('-', ' ')} Checklist</h3>
                                    <ChevronsUpDown className="h-4 w-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-2">
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label>Toggle Checklist (Dev Only)</Label>
                                        <p className="text-xs text-muted-foreground">Switch between pre and post flight views.</p>
                                    </div>
                                    <Switch
                                        checked={checklistType === 'post-flight'}
                                        onCheckedChange={(checked) => setChecklistType(checked ? 'post-flight' : 'pre-flight')}
                                    />
                                </div>
                                
                                {checklistType === 'pre-flight' ? (
                                    <div className="space-y-2">
                                        <Label>Onboard Documents</Label>
                                        <div className="space-y-3 rounded-lg border p-4">
                                            {allChecklistDocs.map(docName => (
                                                <div key={docName} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={docName}
                                                        checked={checkedItems[docName] || false}
                                                        onCheckedChange={(checked) => handleCheckboxChange(docName, !!checked)}
                                                    />
                                                    <Label htmlFor={docName} className="font-normal text-base cursor-pointer">
                                                        {docName}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Post-Flight Checks</Label>
                                         <div className="space-y-3 rounded-lg border p-4">
                                            <p className="text-muted-foreground text-sm">Post-flight checks (e.g., snag reporting, photo uploads) will go here.</p>
                                         </div>
                                    </div>
                                )}

                            </CollapsibleContent>
                        </Collapsible>
                    </>
                )}
              </form>
            </ScrollArea>
          </Form>
          <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-center items-stretch gap-2 px-6 pb-6">
              <Button type="submit" className='flex-1' onClick={form.handleSubmit(onSubmit)}>{isEditing ? 'Save Changes' : 'Create Booking'}</Button>
                {isEditing && (
                <>
                    <Button type="button" variant="destructive" onClick={triggerDeleteDialog} className='flex-1'>
                        Delete
                    </Button>
                    <Button type="button" variant="outline" className='text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive flex-1' onClick={triggerCancelDialog} >
                        Cancel Booking
                    </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Confirmation Dialog */}
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
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCancellationReason('')}>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelBooking} disabled={!cancellationReason.trim()}>
                    Yes, Cancel Booking
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
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
