'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground bg-muted/5 m-8 rounded-[2.5rem] border-2 border-dashed animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 rounded-[2rem] bg-background border-2 shadow-xl flex items-center justify-center mb-6 rotate-3">
            <Plane className="h-10 w-10 text-primary/20" />
        </div>
        <div className="space-y-1 text-center">
            <p className="text-xl font-black uppercase tracking-tight text-foreground">Hangar Empty</p>
            <p className="text-[10px] font-bold uppercase tracking-widest italic opacity-40">No aviation assets have been registered in the local vault.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="hidden md:block overflow-hidden rounded-[2rem] border-2 shadow-sm bg-background">
          <Table>
            <TableHeader className="bg-muted/5 border-b-2">
              <TableRow className="hover:bg-transparent border-b-0">
                <TableHead className="h-14 px-8 text-[10px] font-medium uppercase tracking-wider text-foreground/80">Identifier</TableHead>
                <TableHead className="h-14 text-[10px] font-medium uppercase tracking-wider text-foreground/80">Asset Configuration</TableHead>
                <TableHead className="h-14 text-[10px] font-medium uppercase tracking-wider text-foreground/80">Category</TableHead>
                <TableHead className="h-14 text-center text-[10px] font-medium uppercase tracking-wider text-foreground/80">Meter Readings</TableHead>
                <TableHead className="h-14 text-[10px] font-medium uppercase tracking-wider text-foreground/80">Operational Status</TableHead>
                <TableHead className="h-14 px-8 text-right text-[10px] font-medium uppercase tracking-wider text-foreground/80">Vault Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ac) => (
                <TableRow key={ac.id} className="hover:bg-muted/5 transition-colors group border-b last:border-b-0">
                  <TableCell className="px-8 py-5">
                    <span className="text-sm font-semibold text-foreground uppercase tracking-tight">{ac.tailNumber}</span>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold uppercase tracking-tight text-foreground">{ac.make} {ac.model}</span>
                        <span className="text-xs font-medium uppercase tracking-wider text-foreground/75">OEM Specification</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <span className="text-sm font-medium uppercase tracking-widest text-foreground">
                      {ac.type || 'Single-Engine'}
                    </span>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/75">Hobbs</span>
                            <span className="text-sm font-medium text-foreground">{ac.currentHobbs?.toFixed(1) || '0.0'}h</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/75">Tacho</span>
                            <span className="text-sm font-medium text-foreground">{ac.currentTacho?.toFixed(1) || '0.0'}h</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <span className="text-sm font-medium uppercase tracking-widest text-emerald-700">Airworthy</span>
                  </TableCell>
                  <TableCell className="text-right px-8 py-5">
                    <Button asChild variant="outline" size="sm" className="h-10 px-6 text-[10px] font-medium uppercase tracking-widest border-2 rounded-2xl shadow-sm group-hover:bg-primary group-hover:text-white transition-all group-hover:border-primary">
                      <Link href={`/assets/aircraft/${ac.id}`}>
                        Open Record
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- MOBILE CARD VIEW --- */}
        <div className="grid grid-cols-1 gap-6 md:hidden pb-24">
          {data.map((ac) => (
            <Card key={ac.id} className="rounded-[2.5rem] border-2 shadow-lg overflow-hidden bg-background group active:scale-95 transition-transform">
              <CardHeader className="p-8 pb-4 bg-muted/5 flex flex-row items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-foreground uppercase tracking-tight leading-none">{ac.tailNumber}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1.5">{ac.make} {ac.model}</span>
                </div>
              </CardHeader>
              <CardContent className="px-8 py-6 grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-2xl bg-muted/5 border-2 border-transparent">
                  <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground opacity-50">Hobbs</p>
                  <p className="text-sm font-medium uppercase tracking-tight text-foreground">{ac.currentHobbs?.toFixed(1) || '0.0'}h</p>
                </div>
                <div className="space-y-2 p-4 rounded-2xl bg-muted/5 border-2 border-transparent">
                  <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground opacity-50">Tacho</p>
                  <p className="text-sm font-medium uppercase tracking-tight text-foreground">{ac.currentTacho?.toFixed(1) || '0.0'}h</p>
                </div>
                <div className="col-span-2 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-foreground">{ac.type || 'SE'}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Certified</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 border-t mt-4">
                <Button asChild variant="ghost" className="w-full h-16 text-[10px] font-medium uppercase tracking-widest rounded-none hover:bg-muted/50">
                  <Link href={`/assets/aircraft/${ac.id}`}>
                    Open Record
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
