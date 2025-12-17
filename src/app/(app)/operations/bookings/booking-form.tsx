
'use client';

import { useState } from 'react';
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
import { Trash2, ChevronsUpDown } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
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


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
}

export function BookingForm({
  isOpen,
  setIsOpen,
  aircraft,
  startTime,
  tenantId,
}: BookingFormProps) {
  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(true);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(true);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(true);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form or state if needed when dialog closes
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogDescription>
            Create a new booking for {aircraft.tailNumber} at {startTime.toLocaleTimeString()}.
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
                        <div className="col-span-1 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="booking-type">Booking Type</Label>
                                <Select>
                                    <SelectTrigger id="booking-type">
                                        <SelectValue placeholder="Select a flight type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="training">Training Flight</SelectItem>
                                        <SelectItem value="private">Private Flight</SelectItem>
                                        <SelectItem value="reposition">Reposition Flight</SelectItem>
                                        <SelectItem value="maintenance">Maintenance Flight</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="col-span-1">
                            {/* Right column content goes here */}
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
