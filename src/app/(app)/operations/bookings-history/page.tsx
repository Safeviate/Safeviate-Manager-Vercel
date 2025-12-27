
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parse } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Aircraft } from '../../assets/page';
import type { PilotProfile, Personnel } from '../../users/personnel/page';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Scale, FilePlus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// A consolidated type for display
type EnrichedBooking = Booking & {
  aircraftTailNumber?: string;
  creatorName?: string;
  fullStartTime?: Date;
  aircraft?: Aircraft;
};

const getBookingTypeAbbreviation = (type: Booking['type']): string => {
    switch (type) {
        case 'Training Flight': return 'T';
        case 'Private Flight': return 'P';
        case 'Maintenance Flight': return 'M';
        case 'Reposition Flight': return 'R';
        default: return '';
    }
}

const getStatusBadgeVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed':
            return 'default';
        case 'Cancelled':
        case 'Cancelled with Reason':
            return 'destructive';
        default:
            return 'secondary';
    }
}

const BookingsTable = ({ bookings, tenantId }: { bookings: EnrichedBooking[], tenantId: string }) => {
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
            <TableHeader>
              <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-center'>View</TableHead>
                  <TableHead className='text-center'>M&B</TableHead>
                  <TableHead className='text-center'>Debrief</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {bookings.map(b => (
                    <TableRow key={b.id} className={cn((b.status === 'Cancelled' || b.status === 'Cancelled with Reason') && 'text-muted-foreground')}>
                        <TableCell className="font-medium">{getBookingTypeAbbreviation(b.type)}{b.bookingNumber}</TableCell>
                        <TableCell>{b.aircraftTailNumber}</TableCell>
                        <TableCell>{b.creatorName}</TableCell>
                        <TableCell>{b.fullStartTime ? format(b.fullStartTime, 'PPP HH:mm') : 'Invalid Date'}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusBadgeVariant(b.status)}>{b.status}</Badge>
                        </TableCell>
                        <TableCell className='text-center'>
                            <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                <Link href={`/operations/bookings-history/${b.id}`}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View Details</span>
                                </Link>
                            </Button>
                        </TableCell>
                        <TableCell className='text-center'>
                            <Button asChild variant={b.massAndBalance ? 'default' : 'outline'} size="icon" className="h-8 w-8" disabled={b.status === 'Cancelled' || b.status === 'Cancelled with Reason'}>
                                <Link href={`/assets/mass-balance?bookingId=${b.id}&aircraftId=${b.aircraftId}`}>
                                    <Scale className="h-4 w-4" />
                                     <span className="sr-only">Mass & Balance</span>
                                </Link>
                            </Button>
                        </TableCell>
                        <TableCell className='text-center'>
                            {b.type === 'Training Flight' && b.status === 'Completed' && (
                                <Button asChild variant="secondary" size="icon" className="h-8 w-8">
                                    {/* This will link to the new debrief page we will create */}
                                    <Link href={`/training/student-debriefs/new?bookingId=${b.id}`}>
                                        <FilePlus className="h-4 w-4" />
                                        <span className="sr-only">Create Debrief</span>
                                    </Link>
                                </Button>
                            )}
                        </TableCell>
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
  const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'personnel')) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'instructors')) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'students')) : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'private-pilots')) : null), [firestore, tenantId]);

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useCollection<Personnel>(personnelQuery);
  const { data: instructors, isLoading: isLoadingInstructors, error: instructorsError } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots, isLoading: isLoadingPrivatePilots, error: privatePilotsError } = useCollection<PilotProfile>(privatePilotsQuery);

  const isLoading = isLoadingBookings || isLoadingAircraft || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;
  const error = bookingsError || aircraftError || personnelError || instructorsError || studentsError || privatePilotsError;

  // --- Data Processing ---
  const enrichedBookings = useMemo((): EnrichedBooking[] => {
    if (!bookings || !aircraft || !personnel || !instructors || !students || !privatePilots) return [];

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
    const allUsers = [...personnel, ...instructors, ...students, ...privatePilots];
    const userMap = new Map(allUsers.map(p => [p.id, `${p.firstName} ${p.lastName}`]));

    return bookings.map(b => {
      const bookingAircraft = aircraftMap.get(b.aircraftId);
      const fullStartTime = b.date && b.startTime ? parse(`${b.date} ${b.startTime}`, 'yyyy-MM-dd HH:mm', new Date()) : undefined;
      
      return {
        ...b,
        aircraftTailNumber: bookingAircraft?.tailNumber || 'Unknown Aircraft',
        creatorName: userMap.get(b.createdById || '') || 'Unknown Creator',
        fullStartTime: fullStartTime,
        aircraft: bookingAircraft,
      };
    });
  }, [bookings, aircraft, personnel, instructors, students, privatePilots]);

  const trainingBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Training Flight'), [enrichedBookings]);
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
            <ScrollArea className="h-[calc(100vh-21rem)]">
                <TabsContent value="all" className='m-0'>
                    <BookingsTable bookings={enrichedBookings} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="training" className='m-0'>
                    <BookingsTable bookings={trainingBookings} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="private" className='m-0'>
                    <BookingsTable bookings={privateBookings} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="maintenance" className='m-0'>
                    <BookingsTable bookings={maintenanceBookings} tenantId={tenantId} />
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
        <CardHeader className="bg-muted/30 p-0">
            <div className="grid grid-cols-2">
                <div className="text-sm font-semibold text-muted-foreground text-center p-2 border-r">Pre-Flight</div>
                <div className="text-sm font-semibold text-muted-foreground text-center p-2">Post-Flight</div>
            </div>
        </CardHeader>
        {renderContent()}
      </Card>
    </div>
  );
}
