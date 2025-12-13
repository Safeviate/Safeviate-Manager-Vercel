
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ViewBookingDetailsProps {
  booking: Booking;
  aircraft: Aircraft | null;
  pilot: PilotProfile | null;
  instructor: PilotProfile | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value?.toString() || 'N/A'}</p>
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

export function ViewBookingDetails({ booking, aircraft, pilot, instructor }: ViewBookingDetailsProps) {
  
  const abbreviation = getBookingTypeAbbreviation(booking.type);

  return (
    <Card>
        <CardHeader>
             <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Booking #{abbreviation}{booking.bookingNumber}</CardTitle>
                    <CardDescription>Details for the booking on {aircraft?.tailNumber}.</CardDescription>
                </div>
                 <Badge variant={booking.status.startsWith('Cancel') ? 'destructive' : 'secondary'}>{booking.status}</Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Aircraft" value={aircraft?.tailNumber} />
                <DetailItem label="Booking Type" value={booking.type} />
                <DetailItem label="Pilot / Student" value={pilot ? `${pilot.firstName} ${pilot.lastName}` : 'N/A'} />
                {booking.type === 'Student Training' && (
                    <DetailItem label="Instructor" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : 'N/A'} />
                )}
                <DetailItem label="Start Time" value={format(booking.startTime.toDate(), 'PPP HH:mm')} />
                <DetailItem label="End Time" value={format(booking.endTime.toDate(), 'PPP HH:mm')} />
            </div>

            {booking.status === 'Cancelled with Reason' && (
                <>
                    <Separator />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Cancellation Reason</p>
                        <p className="text-base font-semibold text-destructive">{booking.cancellationReason || 'No reason provided.'}</p>
                    </div>
                </>
            )}

            {/* TODO: Add checklist details here once they are available */}
        </CardContent>
    </Card>
  );
}
