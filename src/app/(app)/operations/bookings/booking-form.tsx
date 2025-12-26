
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
  DialogTrigger,
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Trash2, PlaneTakeoff, LandPlot, Ban, Scale } from 'lucide-react';
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
import { format, addHours, parse, addDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBooking, updateBooking, deleteBooking, cancelBooking } from './booking-functions';
import { PreFlightChecklistDialog } from './pre-flight-checklist-dialog';
import { PostFlightChecklistDialog } from './post-flight-checklist-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
  pilots: PilotProfile[];
  allBookingsForAircraft: Booking[];
  existingBooking?: Booking;
  refreshBookings: () => void;
}

export function BookingForm({
  isOpen,
  setIsOpen,
  aircraft,
  startTime: initialStartTime,
  tenantId,
  pilots,
  allBookingsForAircraft,
  existingBooking,
  refreshBookings,
}: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!existingBooking;

  // Form state
  const [bookingType, setBookingType] = useState<Booking['type'] | ''>('');
  const [pilotId, setPilotId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [startTimeValue, setStartTimeValue] = useState('');
  const [endTimeValue, setEndTimeValue] = useState('');
  const [isOvernight, setIsOvernight] = useState(false);
  const [overnightEndTime, setOvernightEndTime] = useState('09:00');
  const [cancellationReason, setCancellationReason] = useState('');
  
  const baseDate = existingBooking ? parse(existingBooking.bookingDate, 'yyyy-MM-dd', new Date()) : initialStartTime;
  
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        if (existingBooking) {
            setBookingType(existingBooking.type || '');
            setPilotId(existingBooking.pilotId || '');
            setStudentId(existingBooking.studentId || '');
            setInstructorId(existingBooking.instructorId || '');
            setStartTimeValue(existingBooking.startTime);
            setEndTimeValue(existingBooking.endTime);
            setIsOvernight(existingBooking.isOvernight || false);
            // Only set overnight end time from booking if it exists, otherwise keep default
            if (existingBooking.overnightEndTime) {
                setOvernightEndTime(existingBooking.overnightEndTime);
            } else {
                setOvernightEndTime('09:00');
            }
        } else {
            // New booking
            const formattedStartTime = format(initialStartTime, 'HH:mm');
            
            setBookingType('');
            setPilotId('');
            setStudentId('');
            setInstructorId('');
            setStartTimeValue(formattedStartTime);
            setIsOvernight(false);
            setOvernightEndTime('09:00');
            // setEndTimeValue is handled by the next useEffect
        }
    }
  }, [existingBooking, initialStartTime, isOpen]);

  useEffect(() => {
    if (isOvernight) {
        setEndTimeValue('23:59');
    } else if (!isEditMode && startTimeValue) {
        try {
            const parsedStartTime = parse(startTimeValue, 'HH:mm', baseDate);
            if (!isNaN(parsedStartTime.getTime())) {
                setEndTimeValue(format(addHours(parsedStartTime, 1), 'HH:mm'));
            }
        } catch (e) {
            // Ignore parse errors if startTimeValue is not yet valid
        }
    }
  }, [isOvernight, isEditMode, startTimeValue, baseDate]);


  const onOpenChange = (open: boolean) => {
    if (!open) {
      refreshBookings();
    }
    setIsOpen(open);
  };
  
  const handleSave = async () => {
    if (!firestore) return;

    if (!bookingType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Booking Type is required.' });
        return;
    }
    
    if (bookingType === 'Training Flight' && (!studentId || !instructorId)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Student and Instructor are required for Training Flights.' });
        return;
    }

    if (bookingType !== 'Training Flight' && !pilotId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Pilot is required for this booking type.' });
        return;
    }

    if (isOvernight && !overnightEndTime) {
        toast({ variant: 'destructive', title: 'Error', description: 'Overnight end time is required.' });
        return;
    }
    
    const bookingDate = format(baseDate, 'yyyy-MM-dd');

    const commonData: Partial<Booking> = {
        bookingDate,
        startTime: startTimeValue,
        type: bookingType,
        isOvernight,
    };
    
    if (bookingType === 'Training Flight') {
        commonData.studentId = studentId;
        commonData.instructorId = instructorId;
        commonData.pilotId = null; // Ensure pilotId is cleared for training flights
    } else {
        commonData.pilotId = pilotId;
        commonData.studentId = null; // Ensure student/instructor IDs are cleared
        commonData.instructorId = null;
    }

    if (isOvernight) {
        const overnightBookingDate = addDays(baseDate, 1);
        commonData.endTime = '23:59';
        commonData.overnightBookingDate = format(overnightBookingDate, 'yyyy-MM-dd');
        commonData.overnightEndTime = overnightEndTime;
    } else {
        commonData.endTime = endTimeValue;
        commonData.overnightBookingDate = null;
        commonData.overnightEndTime = null;
    }

    if (isEditMode && existingBooking) {
        try {
            await updateBooking({
                firestore, 
                tenantId, 
                bookingId: existingBooking.id, 
                updateData: commonData, 
                aircraft
            });
            toast({ title: 'Booking Updated', description: `Booking #${existingBooking.bookingNumber} has been updated.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            return;
        }

    } else {
        try {
            await createBooking(firestore, tenantId, { aircraftId: aircraft.id, ...commonData } as Omit<Booking, 'id'>);
            toast({ title: 'Booking Created', description: 'The new booking has been saved successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
            return;
        }
    }

    setIsOpen(false);
    refreshBookings();
  };
  
  const handleCancelBooking = async () => {
    if (!firestore || !existingBooking) return;
    try {
        await cancelBooking(firestore, tenantId, existingBooking.id, cancellationReason);
        toast({ title: 'Booking Cancelled', description: `Booking #${existingBooking.bookingNumber} has been cancelled.` });
        setIsCancelDialogOpen(false);
        setIsOpen(false);
        refreshBookings();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
    }
  };

  const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);
  const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
  const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot'), [pilots]);

  const { isPreFlightDisabled, isPostFlightDisabled, warningMessage } = useMemo(() => {
    if (!isEditMode || !existingBooking) {
        return { isPreFlightDisabled: true, isPostFlightDisabled: true, warningMessage: null };
    }

    const preFlightSubmitted = !!existingBooking.preFlight;
    const postFlightSubmitted = !!existingBooking.postFlight;

    // Find the booking immediately preceding this one for the same aircraft
    const previousBooking = allBookingsForAircraft
        .filter(b => {
            const bEnd = parse(`${b.bookingDate}T${b.endTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
            const thisStart = parse(`${existingBooking.bookingDate}T${existingBooking.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
            return b.id !== existingBooking.id && bEnd <= thisStart;
        })
        .sort((a, b) => {
            const aEnd = parse(`${a.bookingDate}T${a.endTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
            const bEnd = parse(`${b.bookingDate}T${b.endTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
            return bEnd.getTime() - aEnd.getTime();
        })[0];
        
    let preFlightDisabled = false;
    let postFlightDisabled = true;
    let warning = null;
    
    // A pre-flight can be done if there is no previous booking, OR if the previous booking is 'Completed'.
    if (previousBooking && previousBooking.status !== 'Completed') {
        preFlightDisabled = true;
        warning = `Cannot start pre-flight until booking #${previousBooking.bookingNumber} is completed.`;
    }
    
    // If pre-flight has been submitted for *this* booking, disable pre-flight button and enable post-flight
    if(preFlightSubmitted) {
        preFlightDisabled = true;
        postFlightDisabled = false;
    }
    
    // If post-flight has been submitted for this booking, disable both
    if (postFlightSubmitted) {
        preFlightDisabled = true;
        postFlightDisabled = true;
    }
    
    return { isPreFlightDisabled: preFlightDisabled, isPostFlightDisabled: postFlightDisabled, warningMessage: warning };

  }, [existingBooking, isEditMode, allBookingsForAircraft]);

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
                {warningMessage && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                          {warningMessage}
                        </AlertDescription>
                    </Alert>
                )}
                
                <div className="flex items-center space-x-2">
                    <Switch id="overnight-mode" checked={isOvernight} onCheckedChange={setIsOvernight} />
                    <Label htmlFor="overnight-mode">Overnight Booking</Label>
                </div>

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
                                <Select onValueChange={setStudentId} value={studentId}>
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
                            disabled={isOvernight}
                        />
                    </div>
                    {isOvernight && (
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="overnight-end-time">Overnight End Time (Next Day)</Label>
                            <Input 
                                id="overnight-end-time" 
                                type="time" 
                                value={overnightEndTime}
                                onChange={(e) => setOvernightEndTime(e.target.value)}
                            />
                       </div>
                    )}
                </div>
                {isEditMode && (
                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <Button onClick={() => setIsPreFlightOpen(true)} disabled={isPreFlightDisabled}>
                      <PlaneTakeoff className="mr-2 h-4 w-4" />
                      Pre-Flight
                    </Button>
                    <Button onClick={() => setIsPostFlightOpen(true)} disabled={isPostFlightDisabled}>
                      <LandPlot className="mr-2 h-4 w-4" />
                      Post-Flight
                    </Button>
                  </div>
                )}
              </div>
          </ScrollArea>
          <DialogFooter className='justify-between pt-6'>
            {isEditMode ? (
                <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" className="w-auto">
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel Booking
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cancel Booking #{existingBooking?.bookingNumber}</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for cancelling this booking. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="cancellation-reason">Reason for Cancellation</Label>
                            <Textarea
                                id="cancellation-reason"
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="e.g., Aircraft maintenance, pilot illness, weather conditions."
                                className="mt-2"
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Back</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={handleCancelBooking}
                                disabled={!cancellationReason.trim()}
                            >
                                Confirm Cancellation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                onChecklistSubmitted={refreshBookings}
            />
            <PostFlightChecklistDialog
                isOpen={isPostFlightOpen}
                setIsOpen={setIsPostFlightOpen}
                booking={existingBooking}
                aircraft={aircraft}
                tenantId={tenantId}
                onChecklistSubmitted={refreshBookings}
            />
        </>
      )}
    </>
  );
}

    