
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';

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
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell className="font-medium">{booking.bookingNumber || 'N/A'}</TableCell>
            <TableCell>{aircraftMap.get(booking.aircraftId) || 'Unknown'}</TableCell>
            <TableCell>{pilotsMap.get(booking.pilotId) || 'Unknown'}</TableCell>
            <TableCell>{format(booking.startTime.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
            <TableCell>{format(booking.endTime.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
            <TableCell>
                <Badge variant={booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason' ? 'destructive' : 'secondary'}
                  className={cn(booking.status === 'Confirmed' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100')}
                >
                    {booking.status}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/operations/bookings/${booking.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                    </Link>
                </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
