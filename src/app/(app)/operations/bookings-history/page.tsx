
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Booking } from '@/types/booking';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';

// A consolidated type for display
type EnrichedBooking = Booking & {
  aircraftTailNumber?: string;
  pilotName?: string;
  preFlightTacho?: number;
  preFlightHobbs?: number;
  postFlightTacho?: number;
  postFlightHobbs?: number;
  preFlightFuelUplift?: string;
  preFlightOilUplift?: string;
  postFlightFuelUplift?: string;
  postFlightOilUplift?: string;
};

export default function BookingsHistoryPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  // --- Data Fetching ---
  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings'), orderBy('bookingNumber', 'desc')) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
  const pilotsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'pilots') : null), [firestore, tenantId]);
  const checklistsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'checklistResponses') : null), [firestore, tenantId]);

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: checklists, isLoading: isLoadingChecklists, error: checklistsError } = useCollection<ChecklistResponse>(checklistsQuery);

  const isLoading = isLoadingBookings || isLoadingAircraft || isLoadingPilots || isLoadingChecklists;
  const error = bookingsError || aircraftError || pilotsError || checklistsError;

  // --- Data Processing ---
  const enrichedBookings = useMemo((): EnrichedBooking[] => {
    if (!bookings || !aircraft || !pilots || !checklists) return [];

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
    const pilotMap = new Map(pilots.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
    const checklistMap = new Map<string, { pre: ChecklistResponse | undefined, post: ChecklistResponse | undefined }>();

    // Group checklists by bookingId
    checklists.forEach(cl => {
        if (!checklistMap.has(cl.bookingId)) {
            checklistMap.set(cl.bookingId, { pre: undefined, post: undefined });
        }
        const entry = checklistMap.get(cl.bookingId)!;
        if (cl.checklistType === 'pre-flight') entry.pre = cl;
        else if (cl.checklistType === 'post-flight') entry.post = cl;
    });

    return bookings.map(b => {
      const checklistData = checklistMap.get(b.id);
      const bookingAircraft = aircraftMap.get(b.aircraftId);
      
      const findMeterReading = (cl: ChecklistResponse | undefined, type: 'tacho' | 'hobbs', prefix: string) => {
        const item = cl?.responses.find(r => r.itemId === `${prefix}-${type}`);
        return item?.[type];
      }

      const findUplift = (cl: ChecklistResponse | undefined, type: 'fuel' | 'oil' | 'left-oil' | 'right-oil', prefix: string) => {
        const item = cl?.responses.find(r => r.itemId === `${prefix}-${type}-uplift`);
        return item?.notes;
      }
      
      let preFlightOil = findUplift(checklistData?.pre, 'oil', 'pre-flight');
      let postFlightOil = findUplift(checklistData?.post, 'oil', 'post-flight');

      if (bookingAircraft?.type === 'Multi-Engine') {
        const preLeft = findUplift(checklistData?.pre, 'left-oil', 'pre-flight');
        const preRight = findUplift(checklistData?.pre, 'right-oil', 'pre-flight');
        if (preLeft || preRight) {
            preFlightOil = `L: ${preLeft || 0} / R: ${preRight || 0}`;
        }
        
        const postLeft = findUplift(checklistData?.post, 'left-oil', 'post-flight');
        const postRight = findUplift(checklistData?.post, 'right-oil', 'post-flight');
        if (postLeft || postRight) {
            postFlightOil = `L: ${postLeft || 0} / R: ${postRight || 0}`;
        }
      }

      return {
        ...b,
        aircraftTailNumber: bookingAircraft?.tailNumber || 'Unknown Aircraft',
        pilotName: pilotMap.get(b.pilotId) || 'Unknown Pilot',
        preFlightTacho: findMeterReading(checklistData?.pre, 'tacho', 'pre-flight'),
        preFlightHobbs: findMeterReading(checklistData?.pre, 'hobbs', 'pre-flight'),
        postFlightTacho: findMeterReading(checklistData?.post, 'tacho', 'post-flight'),
        postFlightHobbs: findMeterReading(checklistData?.post, 'hobbs', 'post-flight'),
        preFlightFuelUplift: findUplift(checklistData?.pre, 'fuel', 'pre-flight'),
        preFlightOilUplift: preFlightOil,
        postFlightFuelUplift: findUplift(checklistData?.post, 'fuel', 'post-flight'),
        postFlightOilUplift: postFlightOil,
      };
    });
  }, [bookings, aircraft, pilots, checklists]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="h-24 text-center">
            <Skeleton className="w-full h-8" count={5} />
             Loading booking history...
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="h-24 text-center text-destructive">
            Error loading data: {error.message}
          </TableCell>
        </TableRow>
      );
    }

    if (enrichedBookings.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
            No booking history found.
          </TableCell>
        </TableRow>
      );
    }

    return enrichedBookings.map(b => (
      <TableRow key={b.id}>
        <TableCell className="font-medium">{b.bookingNumber}</TableCell>
        <TableCell>{b.aircraftTailNumber}</TableCell>
        <TableCell>{b.pilotName}</TableCell>
        <TableCell>{format(b.startTime.toDate(), 'PPP HH:mm')}</TableCell>
        <TableCell>{b.preFlightTacho?.toFixed(2) || 'N/A'}</TableCell>
        <TableCell>{b.preFlightHobbs?.toFixed(2) || 'N/A'}</TableCell>
        <TableCell>{b.postFlightTacho?.toFixed(2) || 'N/A'}</TableCell>
        <TableCell>{b.postFlightHobbs?.toFixed(2) || 'N/A'}</TableCell>
        <TableCell>{b.preFlightFuelUplift || 'N/A'}</TableCell>
        <TableCell>{b.preFlightOilUplift || 'N/A'}</TableCell>
        <TableCell>{b.postFlightFuelUplift || 'N/A'}</TableCell>
        <TableCell>{b.postFlightOilUplift || 'N/A'}</TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-6 h-full">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bookings History</h1>
                <p className="text-muted-foreground">A complete log of all past and present bookings.</p>
            </div>
        </div>
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-15rem)]">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Pilot</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Pre Tacho</TableHead>
                    <TableHead>Pre Hobbs</TableHead>
                    <TableHead>Post Tacho</TableHead>
                    <TableHead>Post Hobbs</TableHead>
                    <TableHead>Pre Fuel</TableHead>
                    <TableHead>Pre Oil</TableHead>
                    <TableHead>Post Fuel</TableHead>
                    <TableHead>Post Oil</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {renderContent()}
                </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
