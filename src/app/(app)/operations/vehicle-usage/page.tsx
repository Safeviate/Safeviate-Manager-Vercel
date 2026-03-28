'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, query, addDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { CarFront, CheckCircle2, ClipboardList, Clock3, LogIn, LogOut } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { MainPageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';
import type { VehicleUsageRecord } from '@/types/vehicle-usage';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const bookOutSchema = z.object({
  vehicleId: z.string().min(1, 'Choose a vehicle.'),
  bookedOutOdometer: z.coerce.number().min(0, 'Odometer must be 0 or higher.'),
  purpose: z.string().min(1, 'Purpose is required.'),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

const bookInSchema = z.object({
  bookedInOdometer: z.coerce.number().min(0, 'Odometer must be 0 or higher.'),
  returnNotes: z.string().optional(),
});

type BookOutValues = z.infer<typeof bookOutSchema>;
type BookInValues = z.infer<typeof bookInSchema>;

const getPersonName = (firstName?: string, lastName?: string, email?: string) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName || email || 'Unknown User';
};

function BookOutDialog({
  tenantId,
  userProfile,
  vehicles,
  activeVehicleIds,
  onBookedOut,
}: {
  tenantId: string;
  userProfile: ReturnType<typeof useUserProfile>['userProfile'];
  vehicles: Vehicle[];
  activeVehicleIds: Set<string>;
  onBookedOut: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => !activeVehicleIds.has(vehicle.id)),
    [vehicles, activeVehicleIds]
  );

  const form = useForm<BookOutValues>({
    resolver: zodResolver(bookOutSchema),
    defaultValues: {
      vehicleId: '',
      bookedOutOdometer: 0,
      purpose: '',
      destination: '',
      notes: '',
    },
  });

  const selectedVehicleId = form.watch('vehicleId');
  const selectedVehicle = availableVehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  useEffect(() => {
    if (!selectedVehicle) return;
    form.setValue('bookedOutOdometer', selectedVehicle.currentOdometer ?? 0, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [selectedVehicle, form]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset({
        vehicleId: '',
        bookedOutOdometer: 0,
        purpose: '',
        destination: '',
        notes: '',
      });
    }
  };

  const onSubmit = async (values: BookOutValues) => {
    if (!firestore || !tenantId || !userProfile) {
      toast({
        variant: 'destructive',
        title: 'Vehicle usage unavailable',
        description: 'Your tenant or user profile is not ready yet.',
      });
      return;
    }

    const vehicle = availableVehicles.find((item) => item.id === values.vehicleId);
    if (!vehicle) {
      toast({
        variant: 'destructive',
        title: 'Vehicle unavailable',
        description: 'Choose an available vehicle before booking out.',
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const usageRef = collection(firestore, `tenants/${tenantId}/vehicle-usage`);

    try {
      await addDoc(usageRef, {
        vehicleId: vehicle.id,
        vehicleRegistrationNumber: vehicle.registrationNumber,
        vehicleLabel: `${vehicle.make} ${vehicle.model}`.trim(),
        status: 'Booked Out',
        bookedOutAt: timestamp,
        bookedOutById: userProfile.id,
        bookedOutByName: getPersonName(userProfile.firstName, userProfile.lastName, userProfile.email),
        bookedOutOdometer: values.bookedOutOdometer,
        purpose: values.purpose.trim(),
        destination: values.destination?.trim() || '',
        notes: values.notes?.trim() || '',
        bookedInAt: null,
        bookedInById: null,
        bookedInByName: null,
        bookedInOdometer: null,
        returnNotes: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await updateDoc(doc(firestore, `tenants/${tenantId}/vehicles/${vehicle.id}`), {
        currentOdometer: values.bookedOutOdometer,
      });

      toast({
        title: 'Vehicle booked out',
        description: `${vehicle.registrationNumber} is now marked as in use.`,
      });

      handleOpenChange(false);
      onBookedOut();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Book out failed',
        description: error instanceof Error ? error.message : 'Unable to book out this vehicle right now.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={availableVehicles.length === 0}>
          <LogOut className="mr-2 h-4 w-4" />
          Book Out Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Out Vehicle</DialogTitle>
          <DialogDescription>Select a vehicle and capture its departure details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookedOutOdometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Out Odometer</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder={selectedVehicle?.currentOdometer?.toFixed(0) || '0'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl>
                      <Input placeholder="Site visit, delivery, meeting..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional trip notes or defects to watch." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Confirm Book Out</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BookInDialog({
  tenantId,
  userProfile,
  usageRecord,
  onBookedIn,
}: {
  tenantId: string;
  userProfile: ReturnType<typeof useUserProfile>['userProfile'];
  usageRecord: VehicleUsageRecord;
  onBookedIn: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<BookInValues>({
    resolver: zodResolver(bookInSchema),
    defaultValues: {
      bookedInOdometer: usageRecord.bookedOutOdometer,
      returnNotes: '',
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      form.reset({
        bookedInOdometer: usageRecord.bookedOutOdometer,
        returnNotes: usageRecord.returnNotes || '',
      });
    }
  };

  const onSubmit = async (values: BookInValues) => {
    if (!firestore || !tenantId || !userProfile) {
      toast({
        variant: 'destructive',
        title: 'Vehicle usage unavailable',
        description: 'Your tenant or user profile is not ready yet.',
      });
      return;
    }

    if (values.bookedInOdometer < usageRecord.bookedOutOdometer) {
      form.setError('bookedInOdometer', {
        type: 'manual',
        message: 'Book in odometer cannot be lower than the book out odometer.',
      });
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      await updateDoc(doc(firestore, `tenants/${tenantId}/vehicle-usage/${usageRecord.id}`), {
        status: 'Booked In',
        bookedInAt: timestamp,
        bookedInById: userProfile.id,
        bookedInByName: getPersonName(userProfile.firstName, userProfile.lastName, userProfile.email),
        bookedInOdometer: values.bookedInOdometer,
        returnNotes: values.returnNotes?.trim() || '',
        updatedAt: timestamp,
      });

      await updateDoc(doc(firestore, `tenants/${tenantId}/vehicles/${usageRecord.vehicleId}`), {
        currentOdometer: values.bookedInOdometer,
      });

      toast({
        title: 'Vehicle booked in',
        description: `${usageRecord.vehicleRegistrationNumber} has been returned.`,
      });

      handleOpenChange(false);
      onBookedIn();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Book in failed',
        description: error instanceof Error ? error.message : 'Unable to book in this vehicle right now.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <LogIn className="mr-2 h-4 w-4" />
          Book In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book In {usageRecord.vehicleRegistrationNumber}</DialogTitle>
          <DialogDescription>Capture the return odometer and close the active trip.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bookedInOdometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book In Odometer</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" min="0" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Booked out at {usageRecord.bookedOutOdometer.toFixed(0)} km
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="returnNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes, defects, or trip summary." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Confirm Book In</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function VehicleUsagePage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const vehiclesQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/vehicles`)) : null),
    [firestore, tenantId]
  );
  const usageQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/vehicle-usage`)) : null),
    [firestore, tenantId]
  );

  const { data: vehicles, isLoading: loadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: usageRecords, isLoading: loadingUsage } = useCollection<VehicleUsageRecord>(usageQuery);

  const canManageVehicleUsage = hasPermission('operations-view') || hasPermission('assets-view');

  const sortedUsageRecords = useMemo(
    () =>
      [...(usageRecords || [])].sort(
        (a, b) => new Date(b.bookedOutAt).getTime() - new Date(a.bookedOutAt).getTime()
      ),
    [usageRecords]
  );

  const activeUsageByVehicleId = useMemo(() => {
    const activeMap = new Map<string, VehicleUsageRecord>();
    for (const record of sortedUsageRecords) {
      if (record.status === 'Booked Out' && !activeMap.has(record.vehicleId)) {
        activeMap.set(record.vehicleId, record);
      }
    }
    return activeMap;
  }, [sortedUsageRecords]);

  const activeVehicleIds = useMemo(() => new Set(activeUsageByVehicleId.keys()), [activeUsageByVehicleId]);

  const stats = useMemo(() => {
    const totalVehicles = vehicles?.length || 0;
    const bookedOutCount = activeVehicleIds.size;
    return {
      totalVehicles,
      bookedOutCount,
      availableCount: Math.max(totalVehicles - bookedOutCount, 0),
    };
  }, [vehicles, activeVehicleIds]);

  if (loadingVehicles || loadingUsage) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader
          title="Vehicle Usage"
          description="Book company vehicles out and back in, with a live view of what is currently on the road."
          actions={
            canManageVehicleUsage && tenantId ? (
              <BookOutDialog
                tenantId={tenantId}
                userProfile={userProfile}
                vehicles={vehicles || []}
                activeVehicleIds={activeVehicleIds}
                onBookedOut={() => undefined}
              />
            ) : undefined
          }
        />
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 bg-background">
          <div className="h-full overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>Total Vehicles</CardDescription>
                <CardTitle className="text-3xl">{stats.totalVehicles}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none border-border bg-muted/40">
              <CardHeader className="pb-2">
                <CardDescription>Currently Booked Out</CardDescription>
                <CardTitle className="text-3xl text-foreground">{stats.bookedOutCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none border-border bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription>Available Now</CardDescription>
                <CardTitle className="text-3xl text-foreground">{stats.availableCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {(vehicles || []).map((vehicle) => {
              const activeRecord = activeUsageByVehicleId.get(vehicle.id);
              const isBookedOut = Boolean(activeRecord);

              return (
                <Card
                  key={vehicle.id}
                  className={cn(
                    'shadow-none border transition-colors',
                    isBookedOut ? 'border-border bg-muted/40' : 'border-border bg-muted/20'
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{vehicle.registrationNumber}</CardTitle>
                        <CardDescription>{vehicle.make} {vehicle.model}</CardDescription>
                      </div>
                      <Badge variant={isBookedOut ? 'secondary' : 'default'}>
                        {isBookedOut ? 'Booked Out' : 'Available'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CarFront className="h-4 w-4" />
                      <span>{vehicle.type || 'Vehicle'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      <span>Current odometer: {vehicle.currentOdometer?.toFixed(0) || '0'} km</span>
                    </div>
                    {activeRecord ? (
                      <div className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          Active usage
                        </div>
                        <p className="text-muted-foreground">
                          Out by {activeRecord.bookedOutByName} on {format(new Date(activeRecord.bookedOutAt), 'dd MMM yyyy HH:mm')}
                        </p>
                        <p className="text-muted-foreground">Purpose: {activeRecord.purpose || 'Not specified'}</p>
                        <p className="text-muted-foreground">Destination: {activeRecord.destination || 'Not specified'}</p>
                        {canManageVehicleUsage && tenantId ? (
                          <BookInDialog
                            tenantId={tenantId}
                            userProfile={userProfile}
                            usageRecord={activeRecord}
                            onBookedIn={() => undefined}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-background p-3 flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>This vehicle is ready to be booked out.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-none border">
            <CardHeader>
              <CardTitle className="text-base">Usage History</CardTitle>
              <CardDescription>Most recent vehicle movements and their return status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sortedUsageRecords.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  No vehicle usage has been recorded yet.
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Booked Out</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Booked In</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsageRecords.map((record) => {
                        const distanceTravelled =
                          record.bookedInOdometer != null ? record.bookedInOdometer - record.bookedOutOdometer : null;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="font-medium">{record.vehicleRegistrationNumber}</div>
                              <div className="text-xs text-muted-foreground">{record.vehicleLabel}</div>
                            </TableCell>
                            <TableCell>
                              <div>{format(new Date(record.bookedOutAt), 'dd MMM yyyy HH:mm')}</div>
                              <div className="text-xs text-muted-foreground">{record.bookedOutByName}</div>
                            </TableCell>
                            <TableCell>{record.purpose || 'Not specified'}</TableCell>
                            <TableCell>
                              <Badge variant={record.status === 'Booked Out' ? 'secondary' : 'default'}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {record.bookedInAt ? (
                                <>
                                  <div>{format(new Date(record.bookedInAt), 'dd MMM yyyy HH:mm')}</div>
                                  <div className="text-xs text-muted-foreground">{record.bookedInByName || 'Returned'}</div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Still out</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {distanceTravelled != null ? `${distanceTravelled.toFixed(0)} km` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
