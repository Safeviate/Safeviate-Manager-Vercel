
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Scale } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import { MassBalanceCalculator } from './mass-balance-calculator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


interface MassBalanceActionsProps {
  booking: Booking;
  aircraft: Aircraft;
  tenantId: string;
}

export function MassBalanceActions({ booking, aircraft, tenantId }: MassBalanceActionsProps) {
  const [isMassBalanceOpen, setIsMassBalanceOpen] = useState(false);

  const handleRefreshAndClose = () => {
    // In a real app with more complex state, you might need to trigger a refresh here.
    // For now, just closing the dialog is sufficient as the data is saved to the booking.
    setIsMassBalanceOpen(false);
  };
  
  const isWithinLimits = booking.massAndBalance?.isWithinLimits;

  return (
    <>
      <Dialog open={isMassBalanceOpen} onOpenChange={setIsMassBalanceOpen}>
        <div className="flex items-center gap-2">
            {booking.massAndBalance && (
                 <Badge variant={isWithinLimits ? 'default' : 'destructive'} className={cn('pointer-events-none', isWithinLimits && 'bg-green-600')}>
                    {isWithinLimits ? 'OK' : 'FAIL'}
                 </Badge>
            )}
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMassBalanceOpen(true)}
            >
                <Scale className="h-4 w-4" />
                <span className="sr-only">Open Mass & Balance Calculator</span>
            </Button>
        </div>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Mass & Balance Calculator</DialogTitle>
                <DialogDescription>
                    For Booking #{booking.bookingNumber} - {aircraft.tailNumber}
                </DialogDescription>
            </DialogHeader>
            <MassBalanceCalculator 
                aircraft={aircraft} 
                booking={booking}
                tenantId={tenantId}
                onSave={handleRefreshAndClose}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
