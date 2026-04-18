'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

interface AircraftTableProps {
  data: Aircraft[];
  isLoading: boolean;
  tenantId: string;
}

export function AircraftTable({ data, isLoading, tenantId }: AircraftTableProps) {
  return (
    <ResponsiveCardGrid
      items={data}
      isLoading={isLoading}
      className="p-4"
      gridClassName="sm:grid-cols-2 xl:grid-cols-3"
      renderItem={(aircraft) => (
        <Card key={aircraft.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
          <CardHeader className="border-b bg-muted/20 px-4 py-3">
            <div className="space-y-1">
              <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">{aircraft.tailNumber}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {aircraft.make} {aircraft.model}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Type</p>
                <p className="mt-1 text-sm font-semibold text-foreground uppercase">{aircraft.type || 'N/A'}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Airframe Hours</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{aircraft.frameHours?.toFixed(1) || '0.0'} hrs</p>
              </div>
            </div>
            <div className="flex justify-end">
              <AircraftActions tenantId={tenantId} aircraft={aircraft} />
            </div>
          </CardContent>
        </Card>
      )}
      emptyState={(
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
          No aircraft found in the fleet.
        </div>
      )}
    />
  );
}
