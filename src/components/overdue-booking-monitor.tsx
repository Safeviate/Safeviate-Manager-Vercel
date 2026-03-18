'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlaneLanding, CheckCircle2 } from 'lucide-react';
import { format, subDays, startOfToday } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import type { OverdueMonitorSettings } from '@/app/(app)/admin/overdue/page';

/**
 * OverdueBookingMonitor
 * Global component that monitors for aircraft that should have landed X minutes ago
 * and prompts the user to confirm their safety based on dynamic admin settings.
 */
export function OverdueBookingMonitor() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());

  // 1. Fetch Dynamic Settings
  const settingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'overdue-monitor') : null),
    [firestore, tenantId]
  );
  const { data: settings } = useDoc<OverdueMonitorSettings>(settingsRef);

  // 2. Tick every minute to re-evaluate "overdue" status as time passes
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 3. Fetch bookings from yesterday and today
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const yesterday = format(subDays(startOfToday(), 1), 'yyyy-MM-dd');
    
    return query(
      collection(firestore, `tenants/${tenantId}/bookings`),
      where('date', 'in', [today, yesterday])
    );
  }, [firestore, tenantId]);

  const aircraftQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/aircrafts`);
  }, [firestore, tenantId]);

  const { data: bookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts } = useCollection<Aircraft>(aircraftQuery);

  const aircraftMap = useMemo(() => {
    if (!aircrafts) return new Map();
    return new Map(aircrafts.map(a => [a.id, a.tailNumber]));
  }, [aircrafts]);

  // 4. Filter for truly overdue bookings (End Time + Threshold minutes)
  const overdueBookings = useMemo(() => {
    if (!bookings || !settings || !settings.isEnabled) return [];
    
    return bookings.filter(b => {
      // Filter out statuses that don't represent an active/overdue flight
      if (b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Cancelled with Reason' || b.status === 'Tentative') {
        return false;
      }
      
      // Ignore if landing is already confirmed
      if (b.landingConfirmed) return false;
      
      const endTime = new Date(b.end).getTime();
      const thresholdMinutes = settings.thresholdMinutes || 5;
      const overdueThreshold = thresholdMinutes * 60 * 1000;
      
      return endTime + overdueThreshold < now;
    });
  }, [bookings, now, settings]);

  // Handle confirmation
  const handleConfirmLanding = (bookingId: string) => {
    if (!firestore || !tenantId) return;
    
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    updateDocumentNonBlocking(bookingRef, { landingConfirmed: true });
    
    toast({
      title: 'Safety Confirmed',
      description: 'The aircraft landing has been recorded.',
    });
  };

  // We only show one alert at a time
  const activeAlert = overdueBookings[0];

  if (!activeAlert || !settings?.isEnabled) return null;

  const tailNumber = aircraftMap.get(activeAlert.aircraftId) || 'Unknown Aircraft';

  return (
    <Dialog open={!!activeAlert} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md border-red-500 shadow-2xl" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2 text-xl font-black">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
            SAFETY ALERT: OVERDUE AIRCRAFT
          </DialogTitle>
          <DialogDescription className="text-foreground font-medium pt-2">
            The scheduled end time for <span className="font-bold text-primary">{tailNumber}</span> was <span className="font-bold">{format(new Date(activeAlert.end), 'HH:mm')}</span>.
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
            <p className="text-xs leading-relaxed italic border-t pt-2">
                Flight tracking policy requires confirmation of safe arrival within {settings.thresholdMinutes} minutes of scheduled landing.
            </p>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          {settings.contactPhone && (
            <Button variant="outline" size="sm" asChild className="no-print">
              <a href={`tel:${settings.contactPhone}`}>Contact Crew</a>
            </Button>
          )}
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold"
            onClick={() => handleConfirmLanding(activeAlert.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Landed Safely
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}