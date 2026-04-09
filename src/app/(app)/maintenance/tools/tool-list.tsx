'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Tool } from '@/types/tool';

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
      <div>
        <div className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Tool Name</TableHead>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Serial No.</TableHead>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Manufacturer</TableHead>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Ownership</TableHead>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Next Calibration</TableHead>
                <TableHead className="text-[10px] uppercase font-medium tracking-wider text-foreground/80">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-medium tracking-wider text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tool) => (
                <TableRow key={tool.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-sm font-medium tracking-tight text-foreground">{tool.name}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground/85">{tool.serialNumber}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground/85">{tool.manufacturer || '-'}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground/85">{getOwnerBadge(tool.ownerType)}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground font-medium">
                      {tool.nextCalibrationDueDate ? format(new Date(tool.nextCalibrationDueDate), 'dd MMM yyyy') : 'No date set'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{getStatusBadge(tool.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium" disabled>
                      <Link href={`#`} className="pointer-events-none opacity-50">
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden pb-20">
          {data.map((tool) => (
            <Card key={tool.id} className="shadow-sm border-slate-200">
              <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-none">{tool.name}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">SN: {tool.serialNumber}</span>
                </div>
                {getStatusBadge(tool.status)}
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Manufacturer</p>
                  <p className="text-sm font-medium text-foreground/85">{tool.manufacturer || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Ownership</p>
                  {getOwnerBadge(tool.ownerType)}
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Next Calibration</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {tool.nextCalibrationDueDate ? format(new Date(tool.nextCalibrationDueDate), 'dd MMM yyyy') : 'No date set'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-medium h-8" disabled>
                  <span>View Details</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
