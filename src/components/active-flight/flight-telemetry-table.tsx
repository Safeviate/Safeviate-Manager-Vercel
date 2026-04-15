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
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <td className={cn('min-w-0 border border-slate-200/80 px-3 py-2.5 align-top sm:px-4', className)}>
      <p className="text-sm font-black text-slate-950 sm:text-base">{value}</p>
    </td>
  );
}

export function FlightTelemetryTable({ heading, speed, altitude, trail, className }: FlightTelemetryTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-sm', className)}>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b border-slate-200/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:px-4 sm:text-[10px]">
              Heading
            </th>
            <th className="border-b border-l border-slate-200/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:px-4 sm:text-[10px]">
              Speed
            </th>
            <th className="border-b border-l border-slate-200/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:px-4 sm:text-[10px]">
              Altitude
            </th>
            <th className="border-b border-l border-slate-200/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:px-4 sm:text-[10px]">
              Trail
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TelemetryCell value={heading} />
            <TelemetryCell value={speed} />
            <TelemetryCell value={altitude} />
            <TelemetryCell value={trail} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
