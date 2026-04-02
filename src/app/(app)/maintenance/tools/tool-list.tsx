'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Eye, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
      <div className="text-center h-48 flex flex-col items-center justify-center text-muted-foreground bg-background m-6 rounded-xl border-2 border-dashed">
        <Wrench className="h-10 w-10 mb-2 opacity-20" />
        <p>No tools found in the registry.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Tool['status']) => {
    switch (status) {
      case 'CALIBRATED':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">Calibrated</Badge>;
      case 'OUT_OF_CALIBRATION':
        return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">Out of Cal</Badge>;
      case 'REFERENCE_ONLY':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold">Reference</Badge>;
      case 'DAMAGED':
      case 'LOST':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">{status}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getOwnerBadge = (type: Tool['ownerType']) => {
    return (
      <Badge variant="outline" className="text-[10px] rounded-full px-3 capitalize">
        {type.toLowerCase()}
      </Badge>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Tool Name</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Serial No.</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Manufacturer</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Ownership</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Next Calibration</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tool) => (
                <TableRow key={tool.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-black text-primary tracking-tight">{tool.name}</TableCell>
                  <TableCell className="text-sm font-medium">{tool.serialNumber}</TableCell>
                  <TableCell className="text-sm">{tool.manufacturer || '-'}</TableCell>
                  <TableCell>{getOwnerBadge(tool.ownerType)}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground font-mono">
                      {tool.nextCalibrationDueDate ? format(new Date(tool.nextCalibrationDueDate), 'dd MMM yyyy') : 'No date set'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tool.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 disabled">
                      <Link href={`#`} className="pointer-events-none opacity-50">
                        <Eye className="h-4 w-4" />
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
                  <span className="text-lg font-black text-primary leading-none">{tool.name}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">SN: {tool.serialNumber}</span>
                </div>
                {getStatusBadge(tool.status)}
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Manufacturer</p>
                  <p className="text-sm font-medium">{tool.manufacturer || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Ownership</p>
                  {getOwnerBadge(tool.ownerType)}
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Next Calibration</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {tool.nextCalibrationDueDate ? format(new Date(tool.nextCalibrationDueDate), 'dd MMM yyyy') : 'No date set'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8" disabled>
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
