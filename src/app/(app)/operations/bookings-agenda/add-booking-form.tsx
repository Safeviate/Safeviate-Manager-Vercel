'use client';

import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { add, format, isBefore } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle } from 'lucide-react';


interface AddBookingFormProps {
  tenantId: string;
  aircraftList: Aircraft[];
  pilots: PilotProfile[];
  selectedDate: Date;
}

export function AddBookingForm({
  tenantId,
  aircraftList,
  pilots,
  selectedDate,
}: AddBookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [aircraftId, setAircraftId] = useState('');
  const [pilotId, setPilotId] = useState('');
  const [bookingType, setBookingType] = useState<'Student Training' | 'Hire and Fly'>('Hire and Fly');
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  
  const pilotOptions = pilots.filter(p => p.userType === 'Private Pilot' || p.userType === 'Instructor' || p.userType === 'Student');

  const resetForm = () => {
    setAircraftId('');
    setPilotId('');
    setBookingType('Hire and Fly');
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };
  
  const handleSaveBooking = () => {
    if (!aircraftId || !pilotId || !bookingType || !startTime || !endTime) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields.' });
        return;
    }
    if (!firestore) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const finalStartTime = new Date(selectedDate);
    finalStartTime.setHours(startHour, startMinute, 0, 0);

    const finalEndTime = new Date(selectedDate);
    finalEndTime.setHours(endHour, endMinute, 0, 0);
    
    if (finalEndTime <= finalStartTime) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'End time must be after start time.' });
        return;
    }

    if (isBefore(finalStartTime, new Date())) {
        toast({
            variant: 'destructive',
            title: 'Cannot Book in the Past',
            description: 'The selected start time has already passed.',
        });
        return;
    }

    const bookingData = {
        aircraftId,
        pilotId,
        type: bookingType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        status: 'Confirmed'
    };

    const bookingsRef = collection(firestore, 'tenants', tenantId, 'bookings');
    addDocumentNonBlocking(bookingsRef, bookingData);
    
    const selectedAircraft = aircraftList.find(a => a.id === aircraftId);
    toast({ title: 'Booking Created', description: `Aircraft ${selectedAircraft?.tailNumber || ''} has been booked.` });
    
    handleOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Booking
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Schedule a new flight for {format(selectedDate, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="aircraft">Aircraft</Label>
                <Select onValueChange={setAircraftId} value={aircraftId}>
                    <SelectTrigger id="aircraft">
                        <SelectValue placeholder="Select an aircraft" />
                    </SelectTrigger>
                    <SelectContent>
                        {aircraftList.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                                {a.tailNumber} ({a.model})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
          <Button onClick={handleSaveBooking}>Create Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
