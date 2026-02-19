
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Aircraft } from '@/types/aircraft';

interface ViewAircraftDialogProps {
  aircraft: Aircraft;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewAircraftDialog({ aircraft, isOpen, onClose }: ViewAircraftDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{aircraft.tailNumber}</DialogTitle>
          <DialogDescription>{aircraft.model} - {aircraft.type}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <p className="text-sm text-muted-foreground">Frame Hours</p>
            <p>{aircraft.frameHours ?? 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <p className="text-sm text-muted-foreground">Engine Hours</p>
            <p>{aircraft.engineHours ?? 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <p className="text-sm text-muted-foreground">Current Hobbs</p>
            <p>{aircraft.currentHobbs ?? 'N/A'}</p>
          </div>
           <div className="grid grid-cols-2 items-center gap-4">
            <p className="text-sm text-muted-foreground">Current Tacho</p>
            <p>{aircraft.currentTacho ?? 'N/A'}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
