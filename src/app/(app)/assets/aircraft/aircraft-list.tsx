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
import { AircraftActions } from './aircraft-actions';
import { ViewActionButton } from '@/components/record-action-buttons';

interface AircraftListProps {
  data: Aircraft[];
  tenantId: string;
  canEdit: boolean;
}

export function AircraftList({ data, tenantId, canEdit }: AircraftListProps) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
            <Plane className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="space-y-1 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">Hangar Empty</p>
            <p className="text-[10px] font-bold uppercase tracking-widest italic">No aviation assets have been registered yet.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-0">
        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="px-6 text-[10px] font-bold uppercase tracking-wider">Identifier</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Asset Configuration</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider">Meter Readings</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Operational Status</TableHead>
                <TableHead className="px-6 text-right text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ac) => (
                <TableRow key={ac.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="px-6 py-4">
                    <span className="text-sm font-bold text-foreground uppercase tracking-tight">{ac.tailNumber}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold uppercase tracking-tight text-foreground">{ac.make} {ac.model}</span>
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">OEM Specification</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                      {ac.type || 'Single-Engine'}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Hobbs</span>
                            <span className="text-sm font-medium text-foreground">{ac.currentHobbs?.toFixed(1) || '0.0'}h</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tacho</span>
                            <span className="text-sm font-medium text-foreground">{ac.currentTacho?.toFixed(1) || '0.0'}h</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-emerald-700">Airworthy</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <ViewActionButton href={`/assets/aircraft/${ac.id}`} label="Open" />
                      <AircraftActions tenantId={tenantId} aircraft={ac} canEdit={canEdit} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- MOBILE CARD VIEW --- */}
        <div className="grid grid-cols-1 md:hidden">
          {data.map((ac) => (
            <Card key={ac.id} className="rounded-none border-x-0 border-t-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 p-4">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-foreground uppercase tracking-tight leading-none">{ac.tailNumber}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1.5">{ac.make} {ac.model}</span>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 px-4 py-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Hobbs</p>
                  <p className="text-sm font-medium uppercase tracking-tight text-foreground">{ac.currentHobbs?.toFixed(1) || '0.0'}h</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Tacho</p>
                  <p className="text-sm font-medium uppercase tracking-tight text-foreground">{ac.currentTacho?.toFixed(1) || '0.0'}h</p>
                </div>
                <div className="col-span-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{ac.type || 'SE'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Certified</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <div className="flex w-full items-center justify-end gap-2">
                  <Button asChild variant="outline" className="h-9 w-full text-[10px] font-black uppercase tracking-widest border-slate-300 shadow-sm">
                    <Link href={`/assets/aircraft/${ac.id}`}>
                      Open
                    </Link>
                  </Button>
                  <AircraftActions tenantId={tenantId} aircraft={ac} canEdit={canEdit} />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
