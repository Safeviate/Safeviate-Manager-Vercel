'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { FilePlus, Clock, User, Plane, ArrowRight, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { useUserProfile } from '@/hooks/use-user-profile';

// A consolidated type for display
type EnrichedBooking = Booking & {
  aircraftTailNumber?: string;
  creatorName?: string;
  fullStartTime?: Date;
  aircraft?: Aircraft;
};

type BookingBuckets = {
  all: EnrichedBooking[];
  training: EnrichedBooking[];
  private: EnrichedBooking[];
  maintenance: EnrichedBooking[];
  cancelled: EnrichedBooking[];
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
        case 'Completed': return 'secondary';
        case 'Cancelled':
        case 'Cancelled with Reason': return 'destructive';
        default: return 'secondary';
    }
}

function DeleteBookingButton({
  bookingId,
  bookingNumber,
  tenantId,
  canDelete,
}: {
  bookingId: string;
  bookingNumber: string;
  tenantId: string;
  canDelete: boolean;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();

    if (!canDelete) return null;

    const handleDelete = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
        deleteDocumentNonBlocking(bookingRef);
        toast({
            title: 'Booking Deleted',
            description: `Booking #${bookingNumber} is being deleted.`,
        });
    };

    return (
        <DeleteActionButton
            description={`This will permanently delete booking #${bookingNumber}. This action cannot be undone.`}
            onDelete={handleDelete}
            srLabel="Delete booking"
        />
    );
}

const BookingsTable = ({
  bookings,
  tenantId,
  canDeleteBookings,
}: {
  bookings: EnrichedBooking[];
  tenantId: string;
  canDeleteBookings: boolean;
}) => {
    if (bookings.length === 0) {
        return (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground italic">
              No bookings found for this category.
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden lg:block">
                <Table>
                    <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">#</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Aircraft</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Creator</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Start Time</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Flight Time</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                        <TableHead className='text-right text-[10px] uppercase font-bold tracking-wider'>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map(b => {
                            const flightHours = (b.status === 'Completed' && b.postFlightData?.hobbs !== undefined && b.preFlightData?.hobbs !== undefined)
                                ? (b.postFlightData.hobbs - b.preFlightData.hobbs).toFixed(1)
                                : null;

                            return (
                                <TableRow key={b.id} className={cn((b.status === 'Cancelled' || b.status === 'Cancelled with Reason' || b.status === 'Completed') && 'text-muted-foreground')}>
                                    <TableCell className="font-bold text-sm text-foreground whitespace-nowrap">{getBookingTypeAbbreviation(b.type)}{b.bookingNumber}</TableCell>
                                    <TableCell className="font-black text-sm uppercase text-foreground">{b.aircraftTailNumber}</TableCell>
                                    <TableCell className="font-bold text-sm text-foreground">{b.creatorName}</TableCell>
                                    <TableCell className="font-medium text-sm text-foreground">{b.fullStartTime ? format(b.fullStartTime, 'dd MMM yy HH:mm') : 'Invalid Date'}</TableCell>
                                    <TableCell className="text-right font-black text-sm text-foreground whitespace-nowrap">
                                        {flightHours !== null ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Clock className="h-3 w-3" />
                                                {flightHours}h
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(b.status)} className="text-[10px] font-black uppercase py-0.5">{b.status}</Badge>
                                    </TableCell>
                                    <TableCell className='text-right whitespace-nowrap'>
                                        <div className="flex justify-end gap-2">
                                            <ViewActionButton href={`/operations/booking-history/${b.id}`} />
                                            {b.type === 'Training Flight' && b.status === 'Completed' && (
                                                <Button asChild variant="secondary" size="icon" className="h-8 w-8">
                                                    <Link href={`/training/student-debriefs/new?bookingId=${b.id}`}>
                                                        <FilePlus className="h-4 w-4" />
                                                        <span className="sr-only">Debrief</span>
                                                    </Link>
                                                </Button>
                                            )}
                                            <DeleteBookingButton
                                              bookingId={b.id}
                                              bookingNumber={b.bookingNumber}
                                              tenantId={tenantId}
                                              canDelete={canDeleteBookings}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {bookings.map(b => {
                    const flightHours = (b.status === 'Completed' && b.postFlightData?.hobbs !== undefined && b.preFlightData?.hobbs !== undefined)
                        ? (b.postFlightData.hobbs - b.preFlightData.hobbs).toFixed(1)
                        : null;

                    return (
                        <Card key={b.id} className="shadow-none border-slate-200 overflow-hidden">
                            <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">#{b.bookingNumber}</span>
                                    <span className="text-sm font-black flex items-center gap-2">
                                        <Plane className="h-3.5 w-3.5 text-primary" />
                                        {b.aircraftTailNumber}
                                    </span>
                                </div>
                                <Badge variant={getStatusBadgeVariant(b.status)} className="h-5 text-[9px] font-black uppercase">
                                    {b.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4 py-3 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        {b.fullStartTime ? format(b.fullStartTime, 'dd MMM yy HH:mm') : 'N/A'}
                                    </div>
                                    {flightHours !== null && (
                                        <div className="font-mono font-bold text-primary">{flightHours}h</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    {b.creatorName}
                                </div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">{b.type}</p>
                            </CardContent>
                            <CardFooter className="p-2 border-t bg-muted/5 flex gap-2">
                                <Button asChild variant="ghost" size="sm" className="flex-1 justify-between text-[10px] font-black uppercase h-8 px-4">
                                    <Link href={`/operations/booking-history/${b.id}`}>
                                        View Flight Details
                                        <ArrowRight className="h-3.5 w-3.5 ml-2" />
                                    </Link>
                                </Button>
                                <div className="flex gap-1">
                                    {b.type === 'Training Flight' && b.status === 'Completed' && (
                                        <Button asChild variant="secondary" size="icon" className="h-8 w-8">
                                            <Link href={`/training/student-debriefs/new?bookingId=${b.id}`}>
                                                <FilePlus className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                    <DeleteBookingButton
                                      bookingId={b.id}
                                      bookingNumber={b.bookingNumber}
                                      tenantId={tenantId}
                                      canDelete={canDeleteBookings}
                                    />
                                </div>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    )
}

export default function BookingsHistoryPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('all');

  const bookingsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'bookings'), orderBy('bookingNumber', 'desc')) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'personnel')) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'instructors')) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'students')) : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'private-pilots')) : null), [firestore, tenantId]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft } = useCollection<Aircraft>(aircraftQuery);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

  const userMap = useMemo(() => {
    if (!personnel || !instructors || !students || !privatePilots) return new Map<string, string>();
    const allUsers = [...personnel, ...instructors, ...students, ...privatePilots];
    const map = new Map(allUsers.map((person) => [person.id, `${person.firstName} ${person.lastName}`]));
    map.set('DEVELOPER_MODE', 'System (Developer)');
    return map;
  }, [personnel, instructors, students, privatePilots]);

  const enrichedBookings = useMemo((): EnrichedBooking[] => {
    if (!bookings || !aircraft || userMap.size === 0) return [];

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));

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
  }, [bookings, aircraft, userMap]);

  const bookingBuckets = useMemo((): BookingBuckets => {
    const activeBookings = enrichedBookings.filter(
      (booking) => booking.status !== 'Cancelled' && booking.status !== 'Cancelled with Reason'
    );

    return {
      all: enrichedBookings,
      training: activeBookings.filter((booking) => booking.type === 'Training Flight'),
      private: activeBookings.filter((booking) => booking.type === 'Private Flight'),
      maintenance: activeBookings.filter((booking) => booking.type === 'Maintenance Flight'),
      cancelled: enrichedBookings.filter(
        (booking) => booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason'
      ),
    };
  }, [enrichedBookings]);

  const canDeleteBookings = hasPermission('bookings-delete');

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'training', label: 'Training' },
    { value: 'private', label: 'Private' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
       <div className="flex justify-between items-center shrink-0">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Bookings History</h1>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Complete flight log archive.</p>
            </div>
        </div>
      <Card className="flex-grow flex flex-col shadow-none border overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
            <ResponsiveTabRow
                value={activeTab}
                onValueChange={setActiveTab}
                placeholder="Filter by Type"
                className="px-6 pt-4 pb-4 shrink-0"
                options={tabs.map((tab) => ({
                    value: tab.value,
                    label: tab.label,
                    icon: ListFilter,
                }))}
            />
            <CardContent className='p-0 flex-1 overflow-hidden'>
                <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                        <TabsContent value="all" className='m-0'><BookingsTable bookings={bookingBuckets.all} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} /></TabsContent>
                        <TabsContent value="training" className='m-0'><BookingsTable bookings={bookingBuckets.training} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} /></TabsContent>
                        <TabsContent value="private" className='m-0'><BookingsTable bookings={bookingBuckets.private} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} /></TabsContent>
                        <TabsContent value="maintenance" className='m-0'><BookingsTable bookings={bookingBuckets.maintenance} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} /></TabsContent>
                        <TabsContent value="cancelled" className='m-0'><BookingsTable bookings={bookingBuckets.cancelled} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} /></TabsContent>
                    </div>
                </ScrollArea>
            </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
