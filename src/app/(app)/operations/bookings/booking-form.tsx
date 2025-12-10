
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection } from 'firebase/firestore';
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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { add, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


interface BookingFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
  aircraft: Aircraft;
  pilots: PilotProfile[];
  initialStartTime: Date;
}

export function BookingForm({
  isOpen,
  onOpenChange,
  tenantId,
  aircraft,
  pilots,
  initialStartTime,
}: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [pilotId, setPilotId] = useState('');
  const [bookingType, setBookingType] = useState<'Student Training' | 'Hire and Fly'>('Hire and Fly');
  const [startTime, setStartTime] = useState(format(initialStartTime, "HH:mm"));
  const [endTime, setEndTime] = useState(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
  
  const pilotOptions = useMemo(() => {
    return pilots.filter(p => p.userType === 'Private Pilot' || p.userType === 'Instructor' || p.userType === 'Student');
  }, [pilots]);

  useEffect(() => {
    setStartTime(format(initialStartTime, "HH:mm"));
    setEndTime(format(add(initialStartTime, { hours: 1 }), "HH:mm"));
  }, [initialStartTime]);

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
  
  const handleAddBooking = () => {
    if (!pilotId || !bookingType || !startTime || !endTime) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
        return;
    }
    if (!firestore) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const finalStartTime = new Date(initialStartTime);
    finalStartTime.setHours(startHour, startMinute, 0, 0);

    const finalEndTime = new Date(initialStartTime);
    finalEndTime.setHours(endHour, endMinute, 0, 0);
    
    if (finalEndTime <= finalStartTime) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'End time must be after start time.' });
        return;
    }

    const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
    addDocumentNonBlocking(bookingsRef, {
        aircraftId: aircraft.id,
        pilotId,
        type: bookingType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        status: 'Confirmed'
    });

    toast({ title: 'Booking Created', description: `Aircraft ${aircraft.tailNumber} has been booked.` });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Booking for {aircraft.tailNumber}</DialogTitle>
          <DialogDescription>
            Schedule a new flight for {format(initialStartTime, 'PPP')}.
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
          <Button onClick={handleAddBooking}>Create Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
