
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { format, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Scale, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


interface ViewBookingDetailsProps {
  booking: Booking;
  aircraft: Aircraft;
  pilot: PilotProfile | null;
  instructor: PilotProfile | null;
  allBookings: Booking[];
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? children : <p className="text-base font-semibold">{value?.toString() || 'N/A'}</p>}
    </div>
);

const getBookingTypeAbbreviation = (type: Booking['type']): string => {
    switch (type) {
        case 'Student Training': return 'T';
        case 'Hire and Fly': return 'H';
        case 'Maintenance Flight': return 'M';
        default: return '';
    }
}

const ChecklistDetails = ({ title, checklist, aircraftType, aircraftStatus, bookingId, isPreFlightDisabled, previousBookingNumber }: { title: string, checklist?: ChecklistResponse, aircraftType?: string, aircraftStatus?: 'ready' | 'needs-post-flight', bookingId: string, isPreFlightDisabled?: boolean, previousBookingNumber?: number }) => {
    
    const checklistTypeParam = title.toLowerCase().replace(' ', '-');
    const isPreFlight = checklistTypeParam === 'pre-flight';

    const statusBadge = (
        <Badge variant={isPreFlight && aircraftStatus === 'needs-post-flight' ? 'destructive' : 'secondary'}>
            {isPreFlight ? (aircraftStatus === 'needs-post-flight' ? 'Post-Flight Required' : 'Ready') : (checklist ? 'Completed' : 'Pending')}
        </Badge>
    );

    if (!checklist) {
        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-base">{title}</h4>
                    {isPreFlight && statusBadge}
                </div>
                <div className='flex flex-col gap-2'>
                  <p className="text-sm text-muted-foreground">Not submitted.</p>
                  {isPreFlight && isPreFlightDisabled && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Post-flight checklist for previous booking #{previousBookingNumber} must be completed first.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-fit" disabled={isPreFlight && isPreFlightDisabled}>
                    <Link href={`/operations/bookings/${bookingId}/checklist?type=${checklistTypeParam}`}>
                      Start {title} Checklist
                    </Link>
                  </Button>
                </div>
            </div>
        )
    }

    const findItemValue = (itemId: string, field: 'tacho' | 'hobbs' | 'notes') => {
        return checklist.responses.find(r => r.itemId === itemId)?.[field]
    }

    let oilUpliftDisplay = 'N/A';
    const singleEngineOilUplift = findItemValue(`${checklist.checklistType}-oil-uplift`, 'notes');
    
    if (aircraftType === 'Multi-Engine') {
        const left = findItemValue(`${checklist.checklistType}-left-oil-uplift`, 'notes');
        const right = findItemValue(`${checklist.checklistType}-right-oil-uplift`, 'notes');
        if (left || right) {
            oilUpliftDisplay = `L: ${left || '0'} / R: ${right || '0'}`;
        }
    } else if (singleEngineOilUplift) {
        oilUpliftDisplay = singleEngineOilUplift.toString();
    }


    return (
        <div>
             <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-base">{title}</h4>
                {isPreFlight && statusBadge}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Tacho" value={findItemValue(`${checklist.checklistType}-tacho`, 'tacho')?.toFixed(2)} />
                <DetailItem label="Hobbs" value={findItemValue(`${checklist.checklistType}-hobbs`, 'hobbs')?.toFixed(2)} />
                <DetailItem label="Fuel Uplift" value={findItemValue(`${checklist.checklistType}-fuel-uplift`, 'notes') || 'N/A'} />
                <DetailItem label="Oil Uplift" value={oilUpliftDisplay} />
            </div>
        </div>
    )
}

export function ViewBookingDetails({ booking, aircraft, pilot, instructor, allBookings }: ViewBookingDetailsProps) {
  const abbreviation = getBookingTypeAbbreviation(booking.type);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const checklistsQuery = useMemoFirebase(
    () => (firestore && aircraft ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id, 'completed-checklists'), where('bookingId', '==', booking.id)) : null),
    [firestore, tenantId, aircraft, booking.id]
  );
  const { data: checklistsForCurrentBooking } = useCollection<ChecklistResponse>(checklistsQuery);


  const preFlightChecklist = useMemo(() => checklistsForCurrentBooking?.find(c => c.checklistType === 'pre-flight'), [checklistsForCurrentBooking]);
  const postFlightChecklist = useMemo(() => checklistsForCurrentBooking?.find(c => c.checklistType === 'post-flight'), [checklistsForCurrentBooking]);

  const { isPreFlightDisabled, previousBooking } = useMemo(() => {
    // Find all bookings for this aircraft, excluding the current one
    const aircraftBookings = allBookings
        .filter(b => b.aircraftId === booking.aircraftId && b.id !== booking.id)
        .sort((a, b) => b.endTime.toMillis() - a.endTime.toMillis()); // Sort descending by end time

    // Find the most recent booking that ended before the current one started
    const previousBooking = aircraftBookings.find(b => isBefore(b.endTime.toDate(), booking.startTime.toDate()));

    if (!previousBooking) {
        return { isPreFlightDisabled: false, previousBooking: null }; // No previous booking, so not disabled
    }

    // A bit of a workaround - if aircraft status is ready, it means the post-flight was done.
    if (aircraft?.checklistStatus === 'ready') {
        return { isPreFlightDisabled: false, previousBooking };
    }

    return { isPreFlightDisabled: true, previousBooking };
    
  }, [booking, allBookings, aircraft]);


  return (
    <div className='space-y-6'>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Booking #{abbreviation}{booking.bookingNumber}</CardTitle>
                        <CardDescription>Details for the booking on {aircraft.tailNumber}.</CardDescription>
                    </div>
                    <Badge variant={booking.status.startsWith('Cancel') ? 'destructive' : 'secondary'}>{booking.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Aircraft" value={aircraft.tailNumber} />
                    <DetailItem label="Booking Type" value={booking.type} />
                    <DetailItem label="Pilot / Student" value={pilot ? `${pilot.firstName} ${pilot.lastName}` : 'N/A'} />
                    <DetailItem label="Start Time" value={format(booking.startTime.toDate(), 'PPP HH:mm')} />
                    <DetailItem label="End Time" value={format(booking.endTime.toDate(), 'PPP HH:mm')} />
                    {booking.type === 'Student Training' && (
                        <DetailItem label="Instructor" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : 'N/A'} />
                    )}
                </div>

                {booking.status === 'Cancelled with Reason' && booking.cancellationReason && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Cancellation Reason</p>
                            <p className="text-base font-semibold text-destructive">{booking.cancellationReason}</p>
                        </div>
                    </>
                )}
            </CardContent>
             <CardFooter>
                <Button asChild variant="outline">
                    <Link href={`/assets/mass-balance?aircraftId=${aircraft.id}&bookingId=${booking.id}`}>
                        <Scale className="mr-2 h-4 w-4" />
                        Mass and Balance
                    </Link>
                </Button>
            </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Checklist Information</CardTitle>
                <CardDescription>Review pre-flight and post-flight data.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <ChecklistDetails 
                        title="Pre-Flight" 
                        checklist={preFlightChecklist} 
                        aircraftType={aircraft.type} 
                        aircraftStatus={aircraft.checklistStatus}
                        bookingId={booking.id}
                        isPreFlightDisabled={isPreFlightDisabled}
                        previousBookingNumber={previousBooking?.bookingNumber}
                    />
                    <ChecklistDetails 
                        title="Post-Flight" 
                        checklist={postFlightChecklist} 
                        aircraftType={aircraft.type} 
                        bookingId={booking.id}
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
