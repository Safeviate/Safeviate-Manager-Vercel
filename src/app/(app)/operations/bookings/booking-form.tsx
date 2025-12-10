
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
import { add, format, isBefore } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Booking } from '@/types/booking';


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
  const [startTime, setStartTime] = useState(format(initialStartTime, "HH:mm"));
  const [endTime, setEndTime] = useState(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
  
  const pilotOptions = useMemo(() => {
    return pilots.filter(p => p.userType === 'Private Pilot' || p.userType === 'Instructor' || p.userType === 'Student');
  }, [pilots]);

  useEffect(() => {
    if (isEditing && booking) {
        // Pre-fill form if editing
        setPilotId(booking.pilotId);
        setBookingType(booking.type);
        setStartTime(format(booking.startTime.toDate(), "HH:mm"));
        setEndTime(format(booking.endTime.toDate(), "HH:mm"));
    } else {
        // Set for new booking
        setStartTime(format(initialStartTime, "HH:mm"));
        setEndTime(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
    }
  }, [initialStartTime, booking, isEditing, isOpen]);

  const resetForm = () => {
    setPilotId('');
    setBookingType('Hire and Fly');
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
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const dateBase = booking ? booking.startTime.toDate() : initialStartTime;
    
    const finalStartTime = new Date(dateBase);
    finalStartTime.setHours(startHour, startMinute, 0, 0);

    const finalEndTime = new Date(dateBase);
    finalEndTime.setHours(endHour, endMinute, 0, 0);
    
    if (finalEndTime <= finalStartTime) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'End time must be after start time.' });
        return;
    }

    // For new bookings, prevent saving if the start time is in the past.
    // For edited bookings, this check is more complex, but a simple check is a good start.
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
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
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
