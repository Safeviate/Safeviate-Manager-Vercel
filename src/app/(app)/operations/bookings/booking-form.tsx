'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { add, format, isBefore, isSameDay, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Booking } from '@/types/booking';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';


interface BookingFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
  aircraft: Aircraft;
  pilots: PilotProfile[];
  initialStartTime: Date;
  booking?: Booking | null; // Make booking optional for editing
}

export function BookingForm({
  isOpen,
  onOpenChange,
  tenantId,
  aircraft,
  pilots,
  initialStartTime,
  booking = null, // Default to null
}: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!booking;

  // Form State
  const [pilotId, setPilotId] = useState('');
  const [bookingType, setBookingType] = useState<'Student Training' | 'Hire and Fly'>('Hire and Fly');
  const [startDate, setStartDate] = useState(initialStartTime);
  const [startTime, setStartTime] = useState(format(initialStartTime, "HH:mm"));
  const [endDate, setEndDate] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
  const [isOvernight, setIsOvernight] = useState(false);
  
  const pilotOptions = useMemo(() => {
    return pilots.filter(p => p.userType === 'Private Pilot' || p.userType === 'Instructor' || p.userType === 'Student');
  }, [pilots]);

  useEffect(() => {
    if (isOpen) {
        if (isEditing && booking) {
            const bookingStartDate = booking.startTime.toDate();
            const bookingEndDate = booking.endTime.toDate();
            // Pre-fill form if editing
            setPilotId(booking.pilotId);
            setBookingType(booking.type);
            setStartDate(bookingStartDate);
            setStartTime(format(bookingStartDate, "HH:mm"));
            setEndDate(bookingEndDate);
            setEndTime(format(bookingEndDate, "HH:mm"));
            setIsOvernight(!isSameDay(bookingStartDate, bookingEndDate));
        } else {
            // Set for new booking
            const newEndDate = add(initialStartTime, {days: isOvernight ? 1 : 0});
            setStartDate(initialStartTime);
            setStartTime(format(initialStartTime, "HH:mm"));
            setEndDate(newEndDate);
            setEndTime(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
        }
    }
  }, [initialStartTime, booking, isEditing, isOpen, isOvernight]);

  const handleOvernightChange = (checked: boolean) => {
    setIsOvernight(checked);
    if (checked) {
        // When toggling on, set end date to the next day
        setEndDate(add(startDate, { days: 1 }));
    } else {
        // When toggling off, set end date to the same day
        setEndDate(startDate);
    }
  };

  const resetForm = () => {
    setPilotId('');
    setBookingType('Hire and Fly');
    setIsOvernight(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };
  
  const handleSaveBooking = () => {
    if (!pilotId || !bookingType || !startTime || !endTime) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
        return;
    }
    if (!firestore) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const finalStartTime = new Date(startDate);
    finalStartTime.setHours(startHour, startMinute, 0, 0);

    const [endHour, endMinute] = endTime.split(':').map(Number);
    const finalEndTime = new Date(endDate);
    finalEndTime.setHours(endHour, endMinute, 0, 0);
    
    if (finalEndTime <= finalStartTime) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'End time must be after start time.' });
        return;
    }

    if (!isEditing && isBefore(finalStartTime, new Date())) {
        toast({
            variant: 'destructive',
            title: 'Cannot Book in the Past',
            description: 'The selected start time has already passed.',
        });
        return;
    }

    const bookingData = {
        aircraftId: aircraft.id,
        pilotId,
        type: bookingType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        status: 'Confirmed'
    };

    if (isEditing && booking) {
        const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
        updateDocumentNonBlocking(bookingRef, bookingData);
        toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
    } else {
        const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
        addDocumentNonBlocking(bookingsRef, bookingData);
        toast({ title: 'Booking Created', description: `Aircraft ${aircraft.tailNumber} has been booked.` });
    }
    
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Create'} Booking for {aircraft.tailNumber}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Modify the booking details.` : `Schedule a new flight for ${format(initialStartTime, 'PPP')}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="pilot">Pilot</Label>
                <Select onValueChange={setPilotId} value={pilotId}>
                    <SelectTrigger id="pilot">
                        <SelectValue placeholder="Select a pilot" />
                    </SelectTrigger>
                    <SelectContent>
                        {pilotOptions.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.firstName} {p.lastName} ({p.userType})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Booking Type</Label>
                 <RadioGroup value={bookingType} onValueChange={(v) => setBookingType(v as any)} className='flex items-center gap-4'>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Hire and Fly" id="hire-fly" />
                        <Label htmlFor="hire-fly">Hire and Fly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Student Training" id="student-training" />
                        <Label htmlFor="student-training">Student Training</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
                <Switch id="overnight-mode" checked={isOvernight} onCheckedChange={handleOvernightChange} />
                <Label htmlFor="overnight-mode">Overnight Booking</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className='w-full justify-start font-normal'>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(startDate, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                           <CustomCalendar selectedDate={startDate} onDateSelect={(d) => d && setStartDate(d)} />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className='w-full justify-start font-normal' disabled={!isOvernight}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(endDate, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                           <CustomCalendar selectedDate={endDate} onDateSelect={(d) => d && setEndDate(d)} />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSaveBooking}>{isEditing ? 'Save Changes' : 'Create Booking'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
