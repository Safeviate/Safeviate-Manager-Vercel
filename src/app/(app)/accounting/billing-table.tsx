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
import type { Personnel, PilotProfile } from '../users/personnel/page';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, User, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

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
      <div className="h-32 text-center flex items-center justify-center text-muted-foreground italic uppercase font-bold tracking-widest bg-muted/5 rounded-lg border m-6">
        No completed flights found for this selection.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden lg:block p-4 lg:p-6 pt-2">
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12 px-4">
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={() => onToggleAll(allIds)}
                  />
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Ref #</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Aircraft</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Client / Student</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Hours (Hobbs)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Rate</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const ac = aircraftMap.get(booking.aircraftId);
                const duration = (booking.postFlightData?.hobbs || 0) - (booking.preFlightData?.hobbs || 0);
                const rate = ac?.hourlyRate || 0;
                const total = duration * rate;

                return (
                  <TableRow key={booking.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="px-4">
                      <Checkbox 
                        checked={selectedIds.has(booking.id)}
                        onCheckedChange={() => onToggleSelection(booking.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] font-black text-primary uppercase">{booking.bookingNumber}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{format(parseLocalDate(booking.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-black text-sm text-foreground uppercase">{ac?.tailNumber || 'Unknown'}</TableCell>
                    <TableCell className="text-sm font-bold text-foreground">{userMap.get(booking.studentId || '') || 'Private / External'}</TableCell>
                    <TableCell className="text-right font-black text-sm text-foreground">{duration.toFixed(1)}h</TableCell>
                    <TableCell className="text-right text-sm font-medium text-muted-foreground">${rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-black text-sm text-primary">${total.toFixed(2)}</TableCell>
                    <TableCell className="px-4">
                      <Badge variant={booking.accountingStatus === 'Exported' ? 'default' : 'secondary'} className="text-[10px] font-black uppercase py-0.5 px-3">
                        {booking.accountingStatus || 'Unbilled'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4">
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
                "shadow-none border-slate-200 transition-colors border-l-4",
                isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent"
              )}
              onClick={() => onToggleSelection(booking.id)}
            >
              <div className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">#{booking.bookingNumber}</span>
                  <span className="text-sm font-black flex items-center gap-2 uppercase">
                    <Plane className="h-3.5 w-3.5 text-primary" />
                    {ac?.tailNumber || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={booking.accountingStatus === 'Exported' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase h-5">
                    {booking.accountingStatus || 'Unbilled'}
                  </Badge>
                  <Checkbox checked={isSelected} className="rounded-full" />
                </div>
              </div>
              <CardContent className="p-4 py-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    {format(parseLocalDate(booking.date), 'dd MMM yyyy')}
                  </div>
                  <div className="font-black text-sm">{duration.toFixed(1)}h</div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {userMap.get(booking.studentId || '') || 'Private / External'}
                </div>
                <div className="flex justify-between items-end border-t pt-2 mt-2">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">Amount Due</span>
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
