
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Booking } from '@/types/booking';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingsTableProps {
  bookings: Booking[];
  aircraftMap: Map<string, string>;
  pilotsMap: Map<string, string>;
  tenantId: string;
}

export function BookingsTable({ bookings, aircraftMap, pilotsMap, tenantId }: BookingsTableProps) {
  if (bookings.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No bookings found.
        </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Booking #</TableHead>
          <TableHead>Aircraft</TableHead>
          <TableHead>Pilot</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell className="font-medium">{booking.bookingNumber || 'N/A'}</TableCell>
            <TableCell>{aircraftMap.get(booking.aircraftId) || 'Unknown'}</TableCell>
            <TableCell>{pilotsMap.get(booking.pilotId) || 'Unknown'}</TableCell>
            <TableCell>{format(booking.startTime.toDate(), 'PPP p')}</TableCell>
            <TableCell>{format(booking.endTime.toDate(), 'PPP p')}</TableCell>
            <TableCell>
                <Badge variant={booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason' ? 'destructive' : 'secondary'}
                  className={cn(booking.status === 'Confirmed' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100')}
                >
                    {booking.status}
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
