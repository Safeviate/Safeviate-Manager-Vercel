'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Car, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Vehicle } from '@/types/vehicle';

export function VehicleList({ data }: { data: Vehicle[] }) {
  const { toast } = useToast();
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      const response = await fetch(`/api/vehicles/${vehicleToDelete.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'The vehicle could not be removed.');
      }
      window.dispatchEvent(new Event('safeviate-vehicles-updated'));
      toast({
        title: 'Vehicle Deleted',
        description: `${vehicleToDelete.registrationNumber} has been removed from the fleet.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'The vehicle could not be removed.',
      });
    } finally {
      setVehicleToDelete(null);
    }
  };

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
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">Registration</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">Vehicle</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">Type</TableHead>
                <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider text-foreground/80">Odometer</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">Next Service</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-foreground/80">Status</TableHead>
                <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((vehicle) => (
              <TableRow key={vehicle.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="text-sm font-semibold text-foreground uppercase tracking-tight">{vehicle.registrationNumber}</TableCell>
                <TableCell className="text-sm font-medium text-foreground/85">{vehicle.make} {vehicle.model}</TableCell>
                <TableCell className="text-sm font-medium uppercase tracking-widest text-foreground">{vehicle.type || 'Car'}</TableCell>
                <TableCell className="text-right text-sm font-medium text-foreground/85">{vehicle.currentOdometer?.toFixed(0) || '0'}</TableCell>
                <TableCell>
                  <div className="text-sm text-foreground/75 font-medium">
                    {vehicle.nextServiceDueDate ? <div>{format(new Date(vehicle.nextServiceDueDate), 'dd MMM yyyy')}</div> : null}
                    {vehicle.nextServiceDueOdometer != null ? <div>{vehicle.nextServiceDueOdometer.toFixed(0)} km</div> : null}
                    {!vehicle.nextServiceDueDate && vehicle.nextServiceDueOdometer == null ? 'Not scheduled' : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium uppercase tracking-widest text-emerald-700">Active</TableCell>
                <TableCell className="text-right text-foreground">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <Link href={`/assets/vehicles/${vehicle.id}`} aria-label={`View ${vehicle.registrationNumber} details`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setVehicleToDelete(vehicle)}
                        aria-label={`Delete ${vehicle.registrationNumber}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                  <span className="text-base font-semibold text-foreground leading-none uppercase">{vehicle.registrationNumber}</span>
                  <span className="mt-1 text-xs font-medium text-foreground/75">{vehicle.make} {vehicle.model}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-700">Active</span>
              </CardHeader>
              <CardContent className="p-4 py-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/75">Odometer</p>
                  <p className="text-sm font-medium text-foreground/85">{vehicle.currentOdometer?.toFixed(0) || '0'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/75">Type</p>
                  <p className="text-sm font-medium uppercase tracking-widest text-foreground">{vehicle.type || 'Car'}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/75">Next Service</p>
                  <p className="text-sm font-medium text-foreground/75">
                    {vehicle.nextServiceDueDate ? format(new Date(vehicle.nextServiceDueDate), 'dd MMM yyyy') : 'No date set'}
                    {vehicle.nextServiceDueOdometer != null ? ` | ${vehicle.nextServiceDueOdometer.toFixed(0)} km` : ''}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t bg-muted/5">
                <div className="flex w-full gap-2">
                  <Button asChild variant="ghost" size="sm" className="flex-1 justify-between text-xs font-medium h-8">
                    <Link href={`/assets/vehicles/${vehicle.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setVehicleToDelete(vehicle)}
                    aria-label={`Delete ${vehicle.registrationNumber}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {vehicleToDelete?.registrationNumber || 'this vehicle'} from the fleet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
