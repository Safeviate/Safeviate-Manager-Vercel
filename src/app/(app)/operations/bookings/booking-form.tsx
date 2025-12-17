
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
import { Trash2 } from 'lucide-react';
import type { Aircraft } from '../../assets/page';

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
            <p>Booking form fields will go here.</p>
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
