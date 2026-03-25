'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, FilePlus, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';

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
        case 'Approved': return 'default';
        case 'Completed': return 'secondary';
        case 'Cancelled':
        case 'Cancelled with Reason': return 'destructive';
        default: return 'secondary';
    }
}

function DeleteBookingButton({ booking }: { booking: EnrichedBooking }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';

    const isCompleted = booking.status === 'Completed';
    const canDelete = hasPermission('bookings-delete') && (!isCompleted || hasPermission('admin-database-manage'));

    if (!canDelete) return null;

    const handleDelete = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        deleteDocumentNonBlocking(bookingRef);
        toast({
            title: 'Booking Deleted',
            description: `Booking #${booking.bookingNumber} is being deleted.`,
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Booking</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {isCompleted && <ShieldAlert className="h-5 w-5 text-destructive" />}
                        Are you sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isCompleted 
                            ? "Warning: You are deleting a COMPLETED flight record. This will remove the audit trail for these airframe hours. This action should only be taken for data entry errors."
                            : `This will permanently delete booking #${booking.bookingNumber}. This action cannot be undone.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

const BookingsTable = ({ bookings }: { bookings: EnrichedBooking[] }) => {
    if (bookings.length === 0) {
        return (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground text-xs uppercase font-bold tracking-widest bg-muted/5">
              No bookings found for this category.
            </div>
        );
    }
    
    return (
         <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
                <TableHeader>
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
                                <TableCell className="font-medium text-sm text-foreground">{b.fullStartTime ? format(b.fullStartTime, 'PPP HH:mm') : 'Invalid Date'}</TableCell>
                                <TableCell className="text-right font-black text-sm text-foreground whitespace-nowrap">
                                    {flightHours !== null ? (
                                        <div className="flex items-center justify-end gap-1">
                                            <Clock className="h-3 w-3" />
                                            {flightHours}h
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <Badge variant={getStatusBadgeVariant(b.status)} className="text-[10px] font-black uppercase py-0.5">{b.status}</Badge>
                                </TableCell>
                                <TableCell className='text-right whitespace-nowrap'>
                                    <div className="flex justify-end gap-2">
                                        <Button asChild variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase">
                                            <Link href={`/bookings/history/${b.id}`}>
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Link>
                                        </Button>
                                        {b.type === 'Training Flight' && b.status === 'Completed' && (
                                            <Button asChild variant="secondary" size="icon" className="h-8 w-8">
                                                <Link href={`/training/student-debriefs/new?bookingId=${b.id}`}>
                                                    <FilePlus className="h-4 w-4" />
                                                    <span className="sr-only">Debrief</span>
                                                </Link>
                                            </Button>
                                        )}
                                        <DeleteBookingButton booking={b} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
         </div>
    )
}

export default function BookingsHistoryPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const isMobile = useIsMobile();

  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings'), orderBy('bookingNumber', 'desc')) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'personnel')) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'instructors')) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'students')) : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'private-pilots')) : null), [firestore, tenantId]);

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft } = useCollection<Aircraft>(aircraftQuery);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

  const enrichedBookings = useMemo((): EnrichedBooking[] => {
    if (!bookings || !aircraft || !personnel || !instructors || !students || !privatePilots) return [];

    const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
    const allUsers = [...personnel, ...instructors, ...students, ...privatePilots];
    const userMap = new Map(allUsers.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
    userMap.set('DEVELOPER_MODE', 'System (Developer)');

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

  const trainingBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Training Flight' && b.status !== 'Cancelled' && b.status !== 'Cancelled with Reason'), [enrichedBookings]);
  const privateBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Private Flight' && b.status !== 'Cancelled' && b.status !== 'Cancelled with Reason'), [enrichedBookings]);
  const maintenanceBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Maintenance Flight' && b.status !== 'Cancelled' && b.status !== 'Cancelled with Reason'), [enrichedBookings]);
  const cancelledBookings = useMemo(() => enrichedBookings.filter(b => b.status === 'Cancelled' || b.status === 'Cancelled with Reason'), [enrichedBookings]);

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full min-h-0">
      <Card className="flex-grow flex flex-col shadow-none border overflow-hidden">
        <Tabs defaultValue="all" className="flex h-full min-h-0 flex-col">
          <MainPageHeader 
            title="Bookings History"
            actions={
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 overflow-x-auto no-scrollbar justify-start w-full flex">
                <TabsTrigger value="all" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-bold uppercase">All</TabsTrigger>
                <TabsTrigger value="training" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-bold uppercase">Training</TabsTrigger>
                <TabsTrigger value="private" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-bold uppercase">Private</TabsTrigger>
                <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-bold uppercase">Maintenance</TabsTrigger>
                <TabsTrigger value="cancelled" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-bold uppercase">Cancelled</TabsTrigger>
              </TabsList>
            }
          />
          <CardContent className='p-0 flex-1 min-h-0'>
                <div className={cn("overflow-auto", isMobile ? "h-full min-h-0" : "h-[calc(100vh-21rem)]")}>
                    <TabsContent value="all" className='m-0'><BookingsTable bookings={enrichedBookings} /></TabsContent>
                    <TabsContent value="training" className='m-0'><BookingsTable bookings={trainingBookings} /></TabsContent>
                    <TabsContent value="private" className='m-0'><BookingsTable bookings={privateBookings} /></TabsContent>
                    <TabsContent value="maintenance" className='m-0'><BookingsTable bookings={maintenanceBookings} /></TabsContent>
                    <TabsContent value="cancelled" className='m-0'><BookingsTable bookings={cancelledBookings} /></TabsContent>
                </div>
            </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
