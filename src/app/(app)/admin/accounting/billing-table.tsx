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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Plane } from 'lucide-react';

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

  if (bookings.length === 0) {
    return (
      <div className="h-32 text-center flex items-center justify-center text-muted-foreground italic bg-card rounded-lg border">
        No completed flights found for this selection.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden lg:block rounded-md border bg-card overflow-hidden">
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
          </TableBody>
        </Table>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {bookings.map((booking) => {
          const ac = aircraftMap.get(booking.aircraftId);
          const duration = (booking.postFlightData?.hobbs || 0) - (booking.preFlightData?.hobbs || 0);
          const rate = ac?.hourlyRate || 0;
          const total = duration * rate;
          const isSelected = selectedIds.has(booking.id);

          return (
            <Card 
              key={booking.id} 
              className={cn(
                "shadow-sm transition-colors border-l-4",
                isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent"
              )}
              onClick={() => onToggleSelection(booking.id)}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">#{booking.bookingNumber}</span>
                  <span className="text-sm font-black flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-primary" />
                    {ac?.tailNumber || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={booking.accountingStatus === 'Exported' ? 'default' : 'secondary'} className="text-[9px] h-5">
                    {booking.accountingStatus || 'Unbilled'}
                  </Badge>
                  <Checkbox checked={isSelected} className="rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-4 py-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(booking.date), 'dd MMM yyyy')}
                  </div>
                  <div className="font-mono font-bold">{duration.toFixed(1)}h</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {userMap.get(booking.studentId || '') || 'Private / External'}
                </div>
                <div className="flex justify-between items-end border-t pt-2 mt-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Amount Due</span>
                  <div className="text-lg font-black text-primary">${total.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
