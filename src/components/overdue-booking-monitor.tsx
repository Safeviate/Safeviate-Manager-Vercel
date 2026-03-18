'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlaneLanding, CheckCircle2, Phone } from 'lucide-react';
import { format, subDays, startOfToday } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import type { OverdueMonitorSettings } from '@/app/(app)/admin/overdue/page';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';

/**
 * OverdueBookingMonitor
 * Global component that monitors for aircraft that should have landed X minutes ago.
 * Now dynamically extracts contact numbers from the instructor and student/pilot profiles.
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

  // 2. Fetch all potential crew collections
  const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);

  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots } = useCollection<PilotProfile>(privatePilotsQuery);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);

  const allUsers = useMemo(() => [
    ...(instructors || []),
    ...(students || []),
    ...(privatePilots || []),
    ...(personnel || [])
  ], [instructors, students, privatePilots, personnel]);

  // 3. Tick every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 4. Fetch bookings and aircraft
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

  // 5. Filter for overdue bookings
  const overdueBookings = useMemo(() => {
    if (!bookings || !settings || !settings.isEnabled) return [];
    
    return bookings.filter(b => {
      if (b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Cancelled with Reason' || b.status === 'Tentative') {
        return false;
      }
      if (b.landingConfirmed) return false;
      
      const endTime = new Date(b.end).getTime();
      const thresholdMinutes = settings.thresholdMinutes || 5;
      const overdueThreshold = thresholdMinutes * 60 * 1000;
      
      return endTime + overdueThreshold < now;
    });
  }, [bookings, now, settings]);

  const activeAlert = overdueBookings[0];

  // 6. Extract specific crew contact numbers
  const crewContacts = useMemo(() => {
    if (!activeAlert || !allUsers.length) return [];
    
    const contacts: { role: string; name: string; phone: string }[] = [];
    
    if (activeAlert.instructorId) {
      const ins = allUsers.find(u => u.id === activeAlert.instructorId);
      if (ins?.contactNumber) {
        contacts.push({ role: 'Instructor', name: `${ins.firstName} ${ins.lastName}`, phone: ins.contactNumber });
      }
    }
    
    if (activeAlert.studentId) {
      const stu = allUsers.find(u => u.id === activeAlert.studentId);
      if (stu?.contactNumber) {
        contacts.push({ role: 'Student/Pilot', name: `${stu.firstName} ${stu.lastName}`, phone: stu.contactNumber });
      }
    }
    
    return contacts;
  }, [activeAlert, allUsers]);

  const handleConfirmLanding = (bookingId: string) => {
    if (!firestore || !tenantId) return;
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    updateDocumentNonBlocking(bookingRef, { landingConfirmed: true });
    toast({ title: 'Safety Confirmed', description: 'The aircraft landing has been recorded.' });
  };

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

        <DialogFooter className="flex flex-col gap-3 sm:gap-2">
          <div className="flex flex-col gap-2 w-full mb-2">
            {crewContacts.map((c, i) => (
              <Button key={i} variant="outline" size="sm" asChild className="no-print w-full justify-start h-10">
                <a href={`tel:${c.phone}`}>
                  <Phone className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{c.role}: {c.name} ({c.phone})</span>
                </a>
              </Button>
            ))}
            {crewContacts.length === 0 && settings?.contactPhone && (
              <Button variant="outline" size="sm" asChild className="no-print w-full justify-start h-10">
                <a href={`tel:${settings.contactPhone}`}>
                  <Phone className="mr-2 h-4 w-4 text-primary" />
                  Ops Fallback: {settings.contactPhone}
                </a>
              </Button>
            )}
          </div>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold w-full h-11"
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