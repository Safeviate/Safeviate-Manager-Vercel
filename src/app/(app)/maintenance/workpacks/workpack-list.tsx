'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Eye, ClipboardList, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Workpack } from '@/types/workpack';

export function WorkpackList({ data }: { data: Workpack[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center h-48 flex flex-col items-center justify-center text-muted-foreground bg-background m-6 rounded-xl border-2 border-dashed">
        <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-foreground/80">No maintenance workpacks initiated.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Workpack['status']) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-sky-50 text-sky-700 border-2 border-sky-200/50 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm ring-1 ring-sky-500/10">Project Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-50 text-amber-700 border-2 border-amber-200/50 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm ring-1 ring-amber-500/10">Active Execution</Badge>;
      case 'PENDING_INSPECTION':
        return <Badge className="bg-purple-50 text-purple-700 border-2 border-purple-200/50 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm ring-1 ring-purple-500/10">Inspection Reqd</Badge>;
      case 'CLOSED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-2 border-emerald-200/50 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm ring-1 ring-emerald-500/10">Released (CRS)</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{status}</Badge>;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="hidden md:block overflow-hidden rounded-2xl border-2 border-slate-200 bg-background shadow-sm mx-6 mt-6">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="text-[10px] uppercase font-black tracking-widest h-12 text-primary">Tracking No.</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest h-12 text-primary">Aircraft Registry</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest h-12 text-primary">Maintenance Scope</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest h-12 text-primary text-center">Commencement</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest h-12 text-primary">Assigned Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-black tracking-widest h-12 text-primary px-6">Terminal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pack) => (
                <TableRow key={pack.id} className="hover:bg-muted/10 transition-all group border-b last:border-0 border-slate-100">
                  <TableCell className="font-mono font-black text-primary tracking-tighter text-sm">{pack.trackingNumber}</TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 tracking-tight leading-none">{pack.aircraftId}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Authorized Asset</span>
                      </div>
                  </TableCell>
                  <TableCell className="text-sm font-bold text-slate-600 tracking-tight">{pack.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center text-xs text-muted-foreground font-mono font-bold">
                      <Clock className="w-3 h-3 mr-1.5 opacity-40" />
                      {pack.openedAt ? format(new Date(pack.openedAt), 'dd MMM yyyy') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(pack.status)}</TableCell>
                  <TableCell className="text-right px-6">
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 text-primary opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-primary/5 hover:scale-110 active:scale-95">
                      <Link href={`/maintenance/workpacks/${pack.id}`}>
                        <Eye className="h-5 w-5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-6 md:hidden pb-24 px-4 pt-6">
          {data.map((pack) => (
            <Card key={pack.id} className="shadow-xl border-2 border-slate-200 rounded-[2rem] overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <CardHeader className="p-6 pb-4 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0 group-hover:bg-primary/5">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1.5 opacity-70">Initiated Order</span>
                  <span className="text-lg font-black font-mono text-slate-900 leading-none uppercase tracking-tighter">{pack.trackingNumber}</span>
                </div>
                {getStatusBadge(pack.status)}
              </CardHeader>
              <CardContent className="p-6 py-5 grid grid-cols-2 gap-y-6">
                <div className="col-span-2 space-y-1.5 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 opacity-50">
                      <ClipboardList className="h-3 w-3" />
                      Maintenance Scope
                  </p>
                  <p className="text-base font-black text-slate-800 leading-tight uppercase tracking-tight">{pack.title}</p>
                </div>
                <div className="space-y-1.5 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Assigned Asset</p>
                  <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{pack.aircraftId}</p>
                </div>
                <div className="space-y-1.5 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Commencement</p>
                  <p className="text-xs font-mono font-black text-muted-foreground">
                    {pack.openedAt ? format(new Date(pack.openedAt), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5 group-hover:bg-primary/5">
                <Button asChild variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase tracking-widest h-12 rounded-2xl transition-all hover:bg-primary/10">
                  <Link href={`/maintenance/workpacks/${pack.id}`}>
                    <span>Access Maintenance Cards</span>
                    <ArrowRight className="h-4 w-4 ml-2 text-primary" />
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
