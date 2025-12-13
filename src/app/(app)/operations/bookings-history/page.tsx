
'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Booking } from '@/types/booking';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { useRouter } from 'next/navigation';

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

const getBookingTypeAbbreviation = (type: Booking['type']): string => {
    switch (type) {
        case 'Student Training': return 'T';
        case 'Hire and Fly': return 'H';
        case 'Maintenance Flight': return 'M';
        default: return '';
    }
}

const BookingsTable = ({ bookings }: { bookings: EnrichedBooking[] }) => {
    const router = useRouter();

    const handleRowClick = (bookingId: string) => {
        window.open(`/operations/bookings/${bookingId}`, '_blank');
    };

    if (bookings.length === 0) {
        return (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
              No bookings found for this category.
            </div>
        );
    }
    
    return (
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
                {bookings.map(b => (
                    <TableRow key={b.id} onClick={() => handleRowClick(b.id)} className="cursor-pointer">
                        <TableCell className="font-medium">{getBookingTypeAbbreviation(b.type)}{b.bookingNumber}</TableCell>
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
                ))}
            </TableBody>
        </Table>
    )
}

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

  const trainingBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Student Training'), [enrichedBookings]);
  const hireAndFlyBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Hire and Fly'), [enrichedBookings]);
  const maintenanceBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Maintenance Flight'), [enrichedBookings]);


  const renderContent = () => {
    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading booking history...</div>
    }

    if (error) {
      return <div className="p-8 text-center text-destructive">Error loading data: {error.message}</div>
    }

    return (
      <Tabs defaultValue="all">
        <div className='px-6 pt-4'>
            <TabsList>
                <TabsTrigger value="all">All Bookings</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="hire-and-fly">Hire & Fly</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
        </div>
        <CardContent className='p-0'>
            <ScrollArea className="h-[calc(100vh-17rem)]">
                <TabsContent value="all" className='m-0'>
                    <BookingsTable bookings={enrichedBookings} />
                </TabsContent>
                <TabsContent value="training" className='m-0'>
                    <BookingsTable bookings={trainingBookings} />
                </TabsContent>
                <TabsContent value="hire-and-fly" className='m-0'>
                    <BookingsTable bookings={hireAndFlyBookings} />
                </TabsContent>
                <TabsContent value="maintenance" className='m-0'>
                    <BookingsTable bookings={maintenanceBookings} />
                </TabsContent>
            </ScrollArea>
        </CardContent>
      </Tabs>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bookings History</h1>
                <p className="text-muted-foreground">A complete log of all past and present bookings.</p>
            </div>
        </div>
      <Card className="flex-grow flex flex-col">
        {renderContent()}
      </Card>
    </div>
  );
}
