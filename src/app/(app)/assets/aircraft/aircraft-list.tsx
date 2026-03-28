
'use client';

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
import { Eye, Clock, Gauge, ArrowRight, Plane } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AircraftListProps {
  data: Aircraft[];
  tenantId: string;
}

export function AircraftList({ data, tenantId }: AircraftListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-48 flex flex-col items-center justify-center text-muted-foreground bg-background m-6 rounded-xl border-2 border-dashed">
        <Plane className="h-10 w-10 mb-2 opacity-20" />
        <p>No aircraft found in the inventory.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div>
        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Tail Number</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Model</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Type</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Current Hobbs</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Current Tacho</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ac) => (
                <TableRow key={ac.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-black text-primary uppercase tracking-tight">{ac.tailNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{ac.make} {ac.model}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] rounded-full px-3">
                      {ac.type || 'Single-Engine'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      Normal
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/assets/aircraft/${ac.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- MOBILE CARD VIEW --- */}
        <div className="grid grid-cols-1 gap-4 md:hidden pb-20">
          {data.map((ac) => (
            <Card key={ac.id} className="shadow-sm border-slate-200">
              <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-primary leading-none uppercase">{ac.tailNumber}</span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">{ac.make} {ac.model}</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">
                  Normal
                </Badge>
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Hobbs
                  </p>
                  <p className="text-sm font-mono font-black">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Gauge className="h-2.5 w-2.5" /> Tacho
                  </p>
                  <p className="text-sm font-mono font-black">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                    {ac.type || 'Single-Engine'}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8">
                  <Link href={`/assets/aircraft/${ac.id}`}>
                    View Details
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
