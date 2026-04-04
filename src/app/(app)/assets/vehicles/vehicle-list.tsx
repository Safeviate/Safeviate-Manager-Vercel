'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Car, Eye, GaugeCircle } from 'lucide-react';
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
import type { Vehicle } from '@/types/vehicle';

export function VehicleList({ data }: { data: Vehicle[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center h-48 flex flex-col items-center justify-center text-muted-foreground bg-background m-6 rounded-xl border-2 border-dashed">
        <Car className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-foreground">No vehicles found in the inventory.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Registration</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Vehicle</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Type</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-foreground/80">Odometer</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Next Service</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((vehicle) => (
                <TableRow key={vehicle.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-black text-primary uppercase tracking-tight">{vehicle.registrationNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{vehicle.make} {vehicle.model}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] rounded-full px-3">
                      {vehicle.type || 'Car'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">{vehicle.currentOdometer?.toFixed(0) || '0'}</TableCell>
                  <TableCell>
                    <div className="text-xs text-foreground/75">
                      {vehicle.nextServiceDueDate ? <div>{format(new Date(vehicle.nextServiceDueDate), 'dd MMM yyyy')}</div> : null}
                      {vehicle.nextServiceDueOdometer != null ? <div>{vehicle.nextServiceDueOdometer.toFixed(0)} km</div> : null}
                      {!vehicle.nextServiceDueDate && vehicle.nextServiceDueOdometer == null ? 'Not scheduled' : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/assets/vehicles/${vehicle.id}`} aria-label={`View ${vehicle.registrationNumber} details`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:hidden pb-20">
          {data.map((vehicle) => (
            <Card key={vehicle.id} className="shadow-sm border-slate-200">
              <CardHeader className="p-4 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-primary leading-none uppercase">{vehicle.registrationNumber}</span>
                  <span className="mt-1 text-xs font-medium text-foreground/75">{vehicle.make} {vehicle.model}</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">
                  Active
                </Badge>
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[9px] font-bold uppercase text-foreground/75">
                    <GaugeCircle className="h-2.5 w-2.5" /> Odometer
                  </p>
                  <p className="text-sm font-mono font-black">{vehicle.currentOdometer?.toFixed(0) || '0'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase text-foreground/75">Type</p>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                    {vehicle.type || 'Car'}
                  </Badge>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[9px] font-bold uppercase text-foreground/75">Next Service</p>
                  <p className="text-xs text-foreground/75">
                    {vehicle.nextServiceDueDate ? format(new Date(vehicle.nextServiceDueDate), 'dd MMM yyyy') : 'No date set'}
                    {vehicle.nextServiceDueOdometer != null ? ` | ${vehicle.nextServiceDueOdometer.toFixed(0)} km` : ''}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-bold h-8">
                  <Link href={`/assets/vehicles/${vehicle.id}`}>
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
