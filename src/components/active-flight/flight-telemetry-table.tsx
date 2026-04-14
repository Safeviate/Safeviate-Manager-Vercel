'use client';

import { cn } from '@/lib/utils';

type FlightTelemetryTableProps = {
  heading: string;
  speed: string;
  altitude: string;
  trail: string;
  className?: string;
};

function TelemetryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 px-3 py-2.5 sm:px-4', className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

export function FlightTelemetryTable({ heading, speed, altitude, trail, className }: FlightTelemetryTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-sm', className)}>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200/80 sm:grid-cols-4">
        <TelemetryCell label="Heading" value={heading} />
        <TelemetryCell label="Speed" value={speed} />
        <TelemetryCell label="Altitude" value={altitude} />
        <TelemetryCell label="Trail" value={trail} />
      </div>
    </div>
  );
}
