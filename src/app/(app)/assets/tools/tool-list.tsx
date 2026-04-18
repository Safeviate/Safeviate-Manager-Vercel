'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Tool } from '@/types/tool';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

export function ToolList({ data }: { data: Tool[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center h-48 flex flex-col items-center justify-center bg-background m-6 rounded-xl border-2 border-dashed">
        <Wrench className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-foreground">No tools found in the registry.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Tool['status']) => {
    switch (status) {
      case 'CALIBRATED':
        return <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-emerald-700">Calibrated</span>;
      case 'OUT_OF_CALIBRATION':
        return <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-red-700">Out of Cal</span>;
      case 'REFERENCE_ONLY':
        return <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-blue-700">Reference</span>;
      case 'DAMAGED':
      case 'LOST':
        return <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-amber-700">{status}</span>;
      default:
        return <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-foreground">{status}</span>;
    }
  };

  const getOwnerBadge = (type: Tool['ownerType']) => {
    return (
      <span className="inline bg-transparent border-0 px-0 py-0 rounded-none shadow-none text-sm font-medium uppercase tracking-widest text-foreground">
        {type.toLowerCase()}
      </span>
    );
  };

  return (
    <ScrollArea className="h-full">
      <ResponsiveCardGrid
        items={data}
        isLoading={false}
        className="p-4 pb-20"
        gridClassName="sm:grid-cols-2 xl:grid-cols-3"
        renderItem={(tool) => (
          <Card key={tool.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">{tool.name}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  SN: {tool.serialNumber}
                </p>
              </div>
              {getStatusBadge(tool.status)}
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Manufacturer</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{tool.manufacturer || '-'}</p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Ownership</p>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-foreground">{tool.ownerType.toLowerCase()}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Next Calibration</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {tool.nextCalibrationDueDate ? format(new Date(tool.nextCalibrationDueDate), 'dd MMM yyyy') : 'No date set'}
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{tool.status}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium" disabled>
                  <Link href={`#`} className="pointer-events-none opacity-50">
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        emptyState={(
          <div className="text-center h-48 flex flex-col items-center justify-center bg-background m-6 rounded-xl border-2 border-dashed">
            <Wrench className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-foreground">No tools found in the registry.</p>
          </div>
        )}
      />
    </ScrollArea>
  );
}
