'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';
import { cn } from '@/lib/utils';
import type { NavlogLeg } from '@/types/booking';
import { Navigation, Trash2 } from 'lucide-react';

interface BookingPlannedLegsPanelProps {
  legs: NavlogLeg[];
  onRemoveLeg: (legId: string) => void;
  emptyMessage?: string;
}

export function BookingPlannedLegsPanel({ legs, onRemoveLeg, emptyMessage = 'Add another waypoint to show legs' }: BookingPlannedLegsPanelProps) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        Planned Legs
      </h3>

      <div className="space-y-2">
        {legs.slice(1).map((leg, i) => {
          const fromLeg = legs[i];
          const fromWaypoint = fromLeg?.waypoint || `WP ${i + 1}`;
          const toWaypoint = leg.waypoint || `WP ${i + 2}`;
          const detailLines = [leg.frequencies, leg.layerInfo].filter(Boolean);

          return (
            <Card
              key={leg.id}
              className={cn('group rounded-xl border bg-background p-3 shadow-none transition-colors hover:bg-muted/20')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="space-y-1">
                    <span className="block truncate text-[11px] font-black uppercase">
                      {`${fromWaypoint} to ${toWaypoint}`}
                    </span>
                    <span className="block font-mono text-[9px] text-muted-foreground">
                      {formatWaypointCoordinatesDms(leg.latitude, leg.longitude)}
                    </span>
                  </div>

                  {detailLines.map((line, index) => (
                    <p
                      key={`${leg.id}-detail-${index}`}
                      className={cn('mt-1 text-[9px] font-semibold leading-tight', index === 0 ? 'text-slate-700' : 'text-slate-700')}
                    >
                      {line}
                    </p>
                  ))}

                  <div className="mt-1 flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                      <span className="text-[10px] font-black">{leg.distance?.toFixed(1) || '0.0'} NM</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">HDG</span>
                      <span className="text-[10px] font-black">{(((leg.magneticHeading ?? 0) + 180) % 360).toFixed(0)}{"\u00B0"}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemoveLeg(leg.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}

        {legs.length === 0 || legs.length === 1 ? (
          <Card className="rounded-xl border border-dashed bg-muted/5 py-8 text-center shadow-none">
            <Navigation className="mx-auto mb-2 h-6 w-6 text-muted-foreground opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{emptyMessage}</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
