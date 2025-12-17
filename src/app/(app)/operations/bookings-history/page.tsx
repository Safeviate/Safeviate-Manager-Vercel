
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

// A temporary type until the real one is restored
type Booking = {
  id: string;
  aircraftId: string;
  pilotId: string;
  type: 'Student Training' | 'Private Flight' | 'Maintenance Flight';
  startTime: Timestamp;
  bookingNumber?: number;
};

// A consolidated type for display
type EnrichedBooking = Booking & {
  aircraftTailNumber?: string;
  pilotName?: string;
};

const getBookingTypeAbbreviation = (type: Booking['type']): string => {
    switch (type) {
        case 'Student Training': return 'T';
        case 'Private Flight': return 'P';
        case 'Maintenance Flight': return 'M';
        default: return '';
    }
}

const BookingsTable = ({ bookings }: { bookings: EnrichedBooking[] }) => {
    const router = useRouter();

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
            </TableRow>
            </TableHeader>
            <TableBody>
                {bookings.map(b => (
                    <TableRow key={b.id}>
                        <TableCell className="font-medium">{getBookingTypeAbbreviation(b.type)}{b.bookingNumber}</TableCell>
                        <TableCell>{b.aircraftTailNumber}</TableCell>
                        <TableCell>{b.pilotName}</TableCell>
                        <TableCell>{format(b.startTime.toDate(), 'PPP HH:mm')}</TableCell>
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

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);

  const isLoading = isLoadingBookings || isLoadingAircraft || isLoadingPilots;
  const error = bookingsError || aircraftError || pilotsError;

  // --- Data Processing ---
  const enrichedBookings = useMemo((): EnrichedBooking[] => {
    if (!bookings || !aircraft || !pilots) return [];

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
    const pilotMap = new Map(pilots.map(p => [p.id, `${p.firstName} ${p.lastName}`]));

    return bookings.map(b => {
      const bookingAircraft = aircraftMap.get(b.aircraftId);
      
      return {
        ...b,
        aircraftTailNumber: bookingAircraft?.tailNumber || 'Unknown Aircraft',
        pilotName: pilotMap.get(b.pilotId) || 'Unknown Pilot',
      };
    });
  }, [bookings, aircraft, pilots]);

  const trainingBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Student Training'), [enrichedBookings]);
  const privateBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Private Flight'), [enrichedBookings]);
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
                <TabsTrigger value="private">Private</TabsTrigger>
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
                <TabsContent value="private" className='m-0'>
                    <BookingsTable bookings={privateBookings} />
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
