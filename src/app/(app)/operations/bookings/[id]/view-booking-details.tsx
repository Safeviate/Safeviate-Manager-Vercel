
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import Link from 'next/link';

interface ViewBookingDetailsProps {
  booking: Booking;
  aircraft: Aircraft;
  pilot: PilotProfile | null;
  instructor: PilotProfile | null;
  checklists: ChecklistResponse[];
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

const ChecklistDetails = ({ title, checklist, aircraftType, bookingId }: { title: string, checklist: ChecklistResponse | undefined, aircraftType?: string, bookingId: string }) => {
    if (!checklist) {
        const checklistTypeParam = title.toLowerCase().replace(' ', '-');
        return (
            <div>
                <h4 className="font-medium text-base mb-2">{title}</h4>
                <div className='flex flex-col gap-2'>
                  <p className="text-sm text-muted-foreground">Not submitted.</p>
                  <Button asChild variant="outline" size="sm" className="w-fit">
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
            <h4 className="font-medium text-base mb-2">{title}</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Tacho" value={findItemValue(`${checklist.checklistType}-tacho`, 'tacho')?.toFixed(2)} />
                <DetailItem label="Hobbs" value={findItemValue(`${checklist.checklistType}-hobbs`, 'hobbs')?.toFixed(2)} />
                <DetailItem label="Fuel Uplift" value={findItemValue(`${checklist.checklistType}-fuel-uplift`, 'notes') || 'N/A'} />
                <DetailItem label="Oil Uplift" value={oilUpliftDisplay} />
            </div>
        </div>
    )
}

export function ViewBookingDetails({ booking, aircraft, pilot, instructor, checklists }: ViewBookingDetailsProps) {
  const abbreviation = getBookingTypeAbbreviation(booking.type);

  const preFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'pre-flight'), [checklists]);
  const postFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'post-flight'), [checklists]);

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
                <Button variant="outline">
                    <Scale className="mr-2 h-4 w-4" />
                    Mass and Balance
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
                    <ChecklistDetails title="Pre-Flight" checklist={preFlightChecklist} aircraftType={aircraft.type} bookingId={booking.id}/>
                    <ChecklistDetails title="Post-Flight" checklist={postFlightChecklist} aircraftType={aircraft.type} bookingId={booking.id}/>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
