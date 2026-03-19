'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';

interface BillingTableProps {
  bookings: Booking[];
  aircrafts: Aircraft[];
  personnel: (Personnel | PilotProfile)[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
}

export function BillingTable({
  bookings,
  aircrafts,
  personnel,
  selectedIds,
  onToggleSelection,
  onToggleAll,
}: BillingTableProps) {
  const aircraftMap = useMemo(() => new Map(aircrafts.map(a => [a.id, a])), [aircrafts]);
  const userMap = useMemo(() => new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`])), [personnel]);

  const allIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const isAllSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={isAllSelected}
                onCheckedChange={() => onToggleAll(allIds)}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Ref #</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Aircraft</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Client / Student</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-right">Hours (Hobbs)</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-right">Rate</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-right">Total</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const ac = aircraftMap.get(booking.aircraftId);
            const duration = (booking.postFlightData?.hobbs || 0) - (booking.preFlightData?.hobbs || 0);
            const rate = ac?.hourlyRate || 0;
            const total = duration * rate;

            return (
              <TableRow key={booking.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(booking.id)}
                    onCheckedChange={() => onToggleSelection(booking.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{booking.bookingNumber}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(booking.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-bold">{ac?.tailNumber || 'Unknown'}</TableCell>
                <TableCell className="text-xs">{userMap.get(booking.studentId || '') || 'Private / External'}</TableCell>
                <TableCell className="text-right font-mono font-bold">{duration.toFixed(1)}h</TableCell>
                <TableCell className="text-right text-muted-foreground">${rate.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-primary">${total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={booking.accountingStatus === 'Exported' ? 'default' : 'secondary'} className="text-[9px] h-5">
                    {booking.accountingStatus || 'Unbilled'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {bookings.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-muted-foreground italic">
                No completed flights found for this selection.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}