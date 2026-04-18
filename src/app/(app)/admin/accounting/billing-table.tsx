'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

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
      <div className="h-32 text-center flex items-center justify-center text-muted-foreground italic bg-card rounded-lg border">
        No completed flights found for this selection.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={() => onToggleAll(allIds)}
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select all</p>
            <p className="text-sm font-semibold text-foreground">{bookings.length} billable flights</p>
          </div>
        </div>
        <Badge variant={bookings.some((booking) => booking.accountingStatus === 'Exported') ? 'default' : 'secondary'} className="text-[9px] h-5">
          {bookings.some((booking) => booking.accountingStatus === 'Exported') ? 'Exported mix' : 'Unbilled'}
        </Badge>
      </div>

      <ScrollArea className="h-full">
        <ResponsiveCardGrid
          items={bookings}
          isLoading={false}
          className="pb-4"
          gridClassName="sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(booking) => {
            const ac = aircraftMap.get(booking.aircraftId);
            const duration = (booking.postFlightData?.hobbs || 0) - (booking.preFlightData?.hobbs || 0);
            const rate = ac?.hourlyRate || 0;
            const total = duration * rate;
            const isSelected = selectedIds.has(booking.id);

            return (
              <Card
                key={booking.id}
                className={cn(
                  "overflow-hidden border-l-4 shadow-none transition-shadow hover:shadow-sm",
                  isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent"
                )}
                onClick={() => onToggleSelection(booking.id)}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[10px] font-black uppercase tracking-widest text-muted-foreground">#{booking.bookingNumber}</p>
                    <p className="flex items-center gap-2 text-sm font-black text-foreground">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      {ac?.tailNumber || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={booking.accountingStatus === 'Exported' ? 'default' : 'secondary'} className="text-[9px] h-5">
                      {booking.accountingStatus || 'Unbilled'}
                    </Badge>
                    <Checkbox checked={isSelected} className="rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Date</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{format(parseLocalDate(booking.date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Hours</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{duration.toFixed(1)}h</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Client / Student</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {userMap.get(booking.studentId || '') || 'Private / External'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Rate</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">${rate.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                      <p className="mt-1 text-sm font-semibold text-primary">${total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }}
          emptyState={(
            <div className="h-32 text-center flex items-center justify-center text-muted-foreground italic bg-card rounded-lg border">
              No completed flights found for this selection.
            </div>
          )}
        />
      </ScrollArea>
    </div>
  );
}
