'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { Tabs, TabsContent } from '@/components/ui/tabs';
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
import { Eye, Trash2, FilePlus, Clock, ShieldAlert, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { useUserProfile } from '@/hooks/use-user-profile';

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

type BookingBuckets = {
  all: EnrichedBooking[];
  training: EnrichedBooking[];
  private: EnrichedBooking[];
  maintenance: EnrichedBooking[];
  cancelled: EnrichedBooking[];
};

function DeleteBookingButton({
  booking,
  tenantId,
  canDelete,
  canDeleteCompleted,
}: {
  booking: EnrichedBooking;
  tenantId: string;
  canDelete: boolean;
  canDeleteCompleted: boolean;
}) {
    const { toast } = useToast();
    const isCompleted = booking.status === 'Completed';

    const isAllowed = canDelete && (!isCompleted || canDeleteCompleted);

    if (!isAllowed) return null;

    const handleDelete = () => {
        void fetch('/api/bookings', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id }),
        });
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
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

const BookingsTable = ({
  bookings,
  tenantId,
  canDeleteBookings,
  canDeleteCompletedBookings,
}: {
  bookings: EnrichedBooking[];
  tenantId: string;
  canDeleteBookings: boolean;
  canDeleteCompletedBookings: boolean;
}) => {
    if (bookings.length === 0) {
        return (
            <div className="h-24 text-center flex items-center justify-center text-muted-foreground text-[10px] uppercase font-black tracking-widest bg-muted/5">
              No bookings found for this category.
            </div>
        );
    }
    
    return (
         <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
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
                                        <Button asChild variant="outline" size="compact" className="border-slate-300">
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
                                        <DeleteBookingButton
                                          booking={b}
                                          tenantId={tenantId}
                                          canDelete={canDeleteBookings}
                                          canDeleteCompleted={canDeleteCompletedBookings}
                                        />
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
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/schedule-data', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled) {
          setBookings(payload?.bookings ?? []);
          setAircraft(payload?.aircraft ?? []);
          setPersonnel(payload?.personnel ?? []);
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
          setAircraft([]);
          setPersonnel([]);
        }
      } finally {
        if (!cancelled) setIsLoadingBookings(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const userMap = useMemo(() => {
    if (!personnel) return new Map<string, string>();
    const map = new Map(personnel.map((person) => [person.id, `${person.firstName} ${person.lastName}`]));
    map.set('DEVELOPER_MODE', 'System (Developer)');
    return map;
  }, [personnel]);

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
  const canDeleteCompletedBookings = hasPermission('admin-database-manage');

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'training', label: 'Training' },
    { value: 'private', label: 'Private' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full min-h-0 px-1">
      <Card className="flex-grow flex flex-col shadow-none border overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col">
          <MainPageHeader title="Bookings History" />
          <ResponsiveTabRow
            value={activeTab}
            onValueChange={setActiveTab}
            placeholder="Filter by Type"
            className="border-b bg-muted/5 px-4 py-3 shrink-0"
            options={tabs.map((tab) => ({
              value: tab.value,
              label: tab.label,
              icon: ListFilter,
            }))}
          />
          <CardContent className='p-0 flex-1 min-h-0'>
                <div className={cn("overflow-auto", isMobile ? "h-full min-h-0" : "h-[calc(100vh-21rem)]")}>
                    <TabsContent value="all" className='m-0'><BookingsTable bookings={bookingBuckets.all} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} canDeleteCompletedBookings={canDeleteCompletedBookings} /></TabsContent>
                    <TabsContent value="training" className='m-0'><BookingsTable bookings={bookingBuckets.training} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} canDeleteCompletedBookings={canDeleteCompletedBookings} /></TabsContent>
                    <TabsContent value="private" className='m-0'><BookingsTable bookings={bookingBuckets.private} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} canDeleteCompletedBookings={canDeleteCompletedBookings} /></TabsContent>
                    <TabsContent value="maintenance" className='m-0'><BookingsTable bookings={bookingBuckets.maintenance} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} canDeleteCompletedBookings={canDeleteCompletedBookings} /></TabsContent>
                    <TabsContent value="cancelled" className='m-0'><BookingsTable bookings={bookingBuckets.cancelled} tenantId={tenantId || ''} canDeleteBookings={canDeleteBookings} canDeleteCompletedBookings={canDeleteCompletedBookings} /></TabsContent>
                </div>
            </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
