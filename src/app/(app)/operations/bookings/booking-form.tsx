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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addHours } from 'date-fns';


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
  pilots: PilotProfile[];
}

export function BookingForm({
  isOpen,
  setIsOpen,
  aircraft,
  startTime,
  tenantId,
  pilots,
}: BookingFormProps) {
  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(true);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);
  
  const [bookingType, setBookingType] = useState('');
  const [startTimeValue, setStartTimeValue] = useState('');
  const [endTimeValue, setEndTimeValue] = useState('');

  useEffect(() => {
    if (startTime) {
      setStartTimeValue(format(startTime, 'HH:mm'));
      const endTimeDate = addHours(startTime, 1);
      setEndTimeValue(format(endTimeDate, 'HH:mm'));
    }
  }, [startTime]);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form or state if needed when dialog closes
    }
    setIsOpen(open);
  };
  
  const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);
  const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
  const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot'), [pilots]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogDescription>
            Create a new booking for {aircraft.tailNumber} on {format(startTime, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Collapsible open={isBookingInfoOpen} onOpenChange={setIsBookingInfoOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                    <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
                        <h4 className="text-sm font-semibold">Booking Information</h4>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="booking-type">Booking Type</Label>
                            <Select onValueChange={setBookingType} value={bookingType}>
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
                                    <Select>
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
                                    <Select>
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
                        {bookingType === 'Private Flight' && (
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="private-pilot">Pilot</Label>
                                <Select>
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
                </CollapsibleContent>
            </Collapsible>

            <Collapsible open={isPreFlightOpen} onOpenChange={setIsPreFlightOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                    <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
                        <h4 className="text-sm font-semibold">Pre-Flight Checks</h4>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                   <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="col-span-1">
                            {/* Left column content goes here */}
                        </div>
                        <div className="col-span-1">
                            {/* Right column content goes here */}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Collapsible open={isPostFlightOpen} onOpenChange={setIsPostFlightOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                    <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
                        <h4 className="text-sm font-semibold">Post-Flight Checks</h4>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="col-span-1">
                            {/* Left column content goes here */}
                        </div>
                        <div className="col-span-1">
                            {/* Right column content goes here */}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
        <DialogFooter className='justify-between'>
            <Button variant="destructive" className="w-20">
                Delete
            </Button>
            <div className='flex gap-2'>
                <DialogClose asChild>
                    <Button variant="outline" className="w-20">Cancel</Button>
                </DialogClose>
                <Button className="w-20">Save</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}