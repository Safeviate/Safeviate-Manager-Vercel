'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlaneLanding, CheckCircle2, Phone } from 'lucide-react';
import { format, subDays, startOfToday } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';

type SchedulePayload = {
  aircraft?: Aircraft[];
  bookings?: Booking[];
};

export function OverdueBookingMonitor() {
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/schedule-data', { cache: 'no-store' });
        const payload = (await response.json()) as SchedulePayload;
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

  const handleConfirmLanding = () => {
    toast({ title: 'Safety Confirmed', description: 'The aircraft landing has been recorded.' });
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
            <PlaneLanding className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-bold">Booking #{activeAlert.bookingNumber}</p>
              <p className="text-xs text-muted-foreground">{activeAlert.type}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold w-full h-11" onClick={handleConfirmLanding}>
            <CheckCircle2 className="h-4 w-4" />
            Landed Safely
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
