'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlaneLanding, CheckCircle2, Phone } from 'lucide-react';
import { format, subDays, startOfToday } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';
import { parseJsonResponse } from '@/lib/safe-json';

type SchedulePayload = {
  aircraft?: Aircraft[];
  bookings?: Booking[];
};

export function OverdueBookingMonitor() {
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/schedule-data', { cache: 'no-store' });
        const payload = (await parseJsonResponse<SchedulePayload>(response)) ?? {};
        if (!cancelled) {
          setBookings(payload.bookings ?? []);
          setAircrafts(payload.aircraft ?? []);
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
          setAircrafts([]);
        }
      }
    };

    void load();
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const overdueBookings = useMemo(() => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const yesterday = format(subDays(startOfToday(), 1), 'yyyy-MM-dd');
    return bookings.filter((booking) => {
      if (!booking?.date || ![today, yesterday].includes(booking.date)) return false;
      if (booking.status === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason' || booking.status === 'Tentative') {
        return false;
      }
      if (booking.landingConfirmed) return false;
      return new Date(booking.end).getTime() + 5 * 60 * 1000 < now;
    });
  }, [bookings, now]);

  const activeAlert = overdueBookings[0];
  if (!activeAlert) return null;

  const tailNumber = aircrafts.find((aircraft) => aircraft.id === activeAlert.aircraftId)?.tailNumber || 'Unknown Aircraft';

  const handleConfirmLanding = async () => {
    if (!activeAlert || isConfirming) return;

    setIsConfirming(true);
    const updatedBooking: Booking = {
      ...activeAlert,
      landingConfirmed: true,
      status: activeAlert.status === 'Completed' ? activeAlert.status : 'Completed',
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: updatedBooking }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to confirm the aircraft landing.');
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === updatedBooking.id ? { ...booking, ...updatedBooking } : booking
        )
      );
      window.dispatchEvent(new Event('safeviate-bookings-updated'));
      toast({ title: 'Safety Confirmed', description: 'The aircraft landing has been recorded.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Confirmation Failed',
        description: error instanceof Error ? error.message : 'Failed to confirm the aircraft landing.',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={!!activeAlert} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-red-500 shadow-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2 text-xl font-black">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
            SAFETY ALERT: OVERDUE AIRCRAFT
          </DialogTitle>
          <DialogDescription className="text-foreground font-medium pt-2">
            The scheduled end time for <span className="font-bold text-primary">{tailNumber}</span> was{' '}
            <span className="font-bold">{format(new Date(activeAlert.end), 'HH:mm')}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
          <div className="flex items-center gap-3">
            <PlaneLanding className="h-5 w-5 text-foreground/70" />
            <div className="text-sm">
              <p className="font-bold">Booking #{activeAlert.bookingNumber}</p>
              <p className="text-xs text-foreground/75">{activeAlert.type}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold w-full h-11" onClick={handleConfirmLanding} disabled={isConfirming}>
            <CheckCircle2 className="h-4 w-4" />
            {isConfirming ? 'Confirming Landing...' : 'Landed Safely'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
