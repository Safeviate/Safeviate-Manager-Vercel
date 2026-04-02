'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Eye, ClipboardList, Clock } from 'lucide-react';
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
import type { Workpack } from '@/types/workpack';

export function WorkpackList({ data }: { data: Workpack[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center h-48 flex flex-col items-center justify-center text-muted-foreground bg-background m-6 rounded-xl border-2 border-dashed">
        <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
        <p>No maintenance workpacks initiated.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Workpack['status']) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px] font-bold">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">In Progress</Badge>;
      case 'PENDING_INSPECTION':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-bold">Pending Inspector</Badge>;
      case 'CLOSED':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">Closed (CRS)</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Tracking No.</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Aircraft</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Title / Scope</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Opened</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pack) => (
                <TableRow key={pack.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-black text-primary tracking-tight">{pack.trackingNumber}</TableCell>
                  <TableCell className="text-sm font-black text-slate-700 tracking-tight">{pack.aircraftId}</TableCell>
                  <TableCell className="text-sm font-medium">{pack.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-xs text-muted-foreground font-mono">
                      <Clock className="w-3 h-3 mr-1" />
                      {pack.openedAt ? format(new Date(pack.openedAt), 'dd MMM yyyy') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(pack.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/maintenance/workpacks/${pack.id}`}>
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
          {data.map((pack) => (
            <Card key={pack.id} className="shadow-sm border-slate-200">
              <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-sm font-black font-mono text-primary leading-none uppercase">{pack.trackingNumber}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1 uppercase font-black">{pack.aircraftId}</span>
                </div>
                {getStatusBadge(pack.status)}
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">Scope</p>
                  <p className="text-sm font-bold leading-tight">{pack.title}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Opened Date</p>
                  <p className="text-xs text-muted-foreground">
                    {pack.openedAt ? format(new Date(pack.openedAt), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8">
                  <Link href={`/maintenance/workpacks/${pack.id}`}>
                    <span>Open Cards</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
