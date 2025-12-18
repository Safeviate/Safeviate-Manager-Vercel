
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Trash2, PlaneTakeoff, LandPlot } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addHours, parse } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBooking, updateBooking, deleteBooking } from './booking-functions';
import { PreFlightChecklistDialog } from './pre-flight-checklist-dialog';
import { PostFlightChecklistDialog } from './post-flight-checklist-dialog';


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
  pilots: PilotProfile[];
  existingBooking?: Booking;
}

export function BookingForm({
  isOpen,
  setIsOpen,
  aircraft,
  startTime: initialStartTime,
  tenantId,
  pilots,
  existingBooking,
}: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!existingBooking;

  // Form state
  const [bookingType, setBookingType] = useState('');
  const [pilotId, setPilotId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [startTimeValue, setStartTimeValue] = useState('');
  const [endTimeValue, setEndTimeValue] = useState('');
  
  const baseDate = existingBooking ? parse(existingBooking.bookingDate, 'yyyy-MM-dd', new Date()) : initialStartTime;
  
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        if (existingBooking) {
            setBookingType(existingBooking.type || '');
            setPilotId(existingBooking.pilotId || '');
            setInstructorId(existingBooking.instructorId || '');
            setStartTimeValue(existingBooking.startTime);
            setEndTimeValue(existingBooking.endTime);
        } else {
            const formattedStartTime = format(initialStartTime, 'HH:mm');
            const formattedEndTime = format(addHours(initialStartTime, 1), 'HH:mm');
            
            setBookingType('');
            setPilotId('');
            setInstructorId('');
            setStartTimeValue(formattedStartTime);
            setEndTimeValue(formattedEndTime);
        }
    }
  }, [existingBooking, initialStartTime, isOpen]);


  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  
  const handleSave = async () => {
    if (!firestore) return;

    if (!bookingType || !pilotId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Booking Type and Pilot are required.' });
      return;
    }

    if (bookingType === 'Training Flight' && !instructorId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Instructor is required for Training Flights.' });
        return;
    }
    
    const bookingDate = format(baseDate, 'yyyy-MM-dd');

    if (isEditMode && existingBooking) {
        const updateData: Partial<Booking> = {
            bookingDate,
            startTime: startTimeValue,
            endTime: endTimeValue,
            type: bookingType as Booking['type'],
            pilotId,
            instructorId: bookingType === 'Training Flight' ? instructorId : '',
        };
        
        try {
            await updateBooking({
                firestore, 
                tenantId, 
                bookingId: existingBooking.id, 
                updateData, 
                aircraft
            });
            toast({ title: 'Booking Updated', description: `Booking #${existingBooking.bookingNumber} has been updated.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            return;
        }

    } else {
        const bookingData: any = {
            aircraftId: aircraft.id,
            pilotId,
            type: bookingType as Booking['type'],
            bookingDate,
            startTime: startTimeValue,
            endTime: endTimeValue,
        };

        if (instructorId) {
            bookingData.instructorId = instructorId;
        }

        try {
            await createBooking(firestore, tenantId, bookingData);
            toast({ title: 'Booking Created', description: 'The new booking has been saved successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
            return;
        }
    }

    setIsOpen(false);
  };
  
  const handleDelete = async () => {
    if (!firestore || !existingBooking) return;
    try {
        await deleteBooking(firestore, tenantId, existingBooking.id);
        toast({ title: 'Booking Deleted', description: `Booking #${existingBooking.bookingNumber} has been deleted.` });
        setIsOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);
  const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
  const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot'), [pilots]);

  const preFlightSubmitted = !!(existingBooking?.preFlight && Object.keys(existingBooking.preFlight).length > 0);
  
  const isCorrectBookingForAction = aircraft.currentBookingId === existingBooking?.id;

  const isPreFlightDisabled = !(isCorrectBookingForAction && (aircraft.checklistStatus === 'needs-pre-flight' || aircraft.checklistStatus === 'Ready'));
  const isPostFlightDisabled = !(isCorrectBookingForAction && preFlightSubmitted && aircraft.checklistStatus === 'needs-post-flight');

  const showPendingActionWarning = (aircraft.checklistStatus === 'needs-pre-flight' || aircraft.checklistStatus === 'needs-post-flight') && aircraft.currentBookingId !== existingBooking?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? `Edit Booking #${existingBooking.bookingNumber}` : 'Create Booking'}</DialogTitle>
            <DialogDescription>
              For {aircraft.tailNumber} on {format(baseDate, 'PPP')}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
              <div className="grid gap-4 py-4 pr-2">
                {showPendingActionWarning && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Required on Another Booking</AlertTitle>
                        <AlertDescription>
                           A pre-flight or post-flight checklist for a previous booking on this aircraft must be completed first.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="booking-type">Booking Type</Label>
                        <Select onValueChange={v => setBookingType(v as Booking['type'])} value={bookingType}>
                            <SelectTrigger id="booking-type">
                                <SelectValue placeholder="Select a flight type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Training Flight">Training Flight</SelectItem>
                                <SelectItem value="Private Flight">Private Flight</SelectItem>
                                <SelectItem value="Reposition Flight">Reposition Flight</SelectItem>
                                <SelectItem value="Maintenance Flight">Maintenance Flight</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {bookingType === 'Training Flight' && (
                        <>
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="student">Student</Label>
                                <Select onValueChange={setPilotId} value={pilotId}>
                                    <SelectTrigger id="student">
                                        <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.firstName} {student.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="instructor">Instructor</Label>
                                <Select onValueChange={setInstructorId} value={instructorId}>
                                    <SelectTrigger id="instructor">
                                        <SelectValue placeholder="Select an instructor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {instructors.map(instructor => (
                                            <SelectItem key={instructor.id} value={instructor.id}>
                                                {instructor.firstName} {instructor.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                    {(bookingType === 'Private Flight' || bookingType === 'Maintenance Flight' || bookingType === 'Reposition Flight') && (
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="private-pilot">Pilot</Label>
                              <Select onValueChange={setPilotId} value={pilotId}>
                                <SelectTrigger id="private-pilot">
                                    <SelectValue placeholder="Select a pilot" />
                                </SelectTrigger>
                                <SelectContent>
                                    {privatePilots.map(pilot => (
                                        <SelectItem key={pilot.id} value={pilot.id}>
                                            {pilot.firstName} {pilot.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input 
                            id="start-time" 
                            type="time"
                            value={startTimeValue}
                            onChange={(e) => setStartTimeValue(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Input 
                            id="end-time" 
                            type="time" 
                            value={endTimeValue}
                            onChange={(e) => setEndTimeValue(e.target.value)}
                        />
                    </div>
                </div>
                {isEditMode && (
                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <Button onClick={() => setIsPreFlightOpen(true)} disabled={isPreFlightDisabled}>
                      <PlaneTakeoff className="mr-2 h-4 w-4" />
                      Pre-Flight Checklist
                    </Button>
                    <Button onClick={() => setIsPostFlightOpen(true)} disabled={isPostFlightDisabled}>
                      <LandPlot className="mr-2 h-4 w-4" />
                      Post-Flight Checklist
                    </Button>
                  </div>
                )}
              </div>
          </ScrollArea>
          <DialogFooter className='justify-between pt-6'>
            {isEditMode ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-20" disabled={!isEditMode}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete booking #{existingBooking?.bookingNumber}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                                Delete Booking
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : (
              <div></div>
            )}
              <div className='flex gap-2'>
                  <DialogClose asChild>
                      <Button variant="outline" className="w-20">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} className="w-20">Save</Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {existingBooking && (
        <>
            <PreFlightChecklistDialog
                isOpen={isPreFlightOpen}
                setIsOpen={setIsPreFlightOpen}
                booking={existingBooking}
                aircraft={aircraft}
                tenantId={tenantId}
            />
            <PostFlightChecklistDialog
                isOpen={isPostFlightOpen}
                setIsOpen={setIsPostFlightOpen}
                booking={existingBooking}
                aircraft={aircraft}
                tenantId={tenantId}
            />
        </>
      )}
    </>
  );
}
