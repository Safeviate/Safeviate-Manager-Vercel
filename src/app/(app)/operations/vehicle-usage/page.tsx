'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CarFront, CheckCircle2, Clock3, LogIn, LogOut, Plus } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';

type VehicleLite = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  type?: string;
  currentOdometer: number;
};

type VehicleUsageLite = {
  id: string;
  vehicleId: string;
  vehicleRegistrationNumber: string;
  vehicleLabel: string;
  status: 'Booked Out' | 'Booked In';
  bookedOutAt: string;
  bookedOutByName: string;
  bookedOutOdometer: number;
  purpose: string;
  destination: string;
  notes: string;
  bookedInAt: string | null;
  bookedInByName: string | null;
  bookedInOdometer: number | null;
  returnNotes: string;
};

const DEFAULT_VEHICLES: VehicleLite[] = [
  { id: 'vehicle-1', registrationNumber: 'SV-001', make: 'Toyota', model: 'Hilux', type: 'Utility', currentOdometer: 100000 },
  { id: 'vehicle-2', registrationNumber: 'SV-002', make: 'Ford', model: 'Ranger', type: 'Utility', currentOdometer: 85000 },
];

const loadLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
};

const getPersonName = (firstName?: string, lastName?: string, email?: string) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName || email || 'Unknown User';
};

function BookOutDialog({
  vehicles,
  activeVehicleIds,
  actorName,
  onBookOut,
}: {
  vehicles: VehicleLite[];
  activeVehicleIds: Set<string>;
  actorName: string;
  onBookOut: (payload: {
    vehicleId: string;
    bookedOutOdometer: number;
    purpose: string;
    destination: string;
    notes: string;
  }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [bookedOutOdometer, setBookedOutOdometer] = useState(0);
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => !activeVehicleIds.has(vehicle.id)),
    [vehicles, activeVehicleIds]
  );

  const selectedVehicle = availableVehicles.find((vehicle) => vehicle.id === vehicleId);

  const reset = () => {
    setVehicleId('');
    setBookedOutOdometer(0);
    setPurpose('');
    setDestination('');
    setNotes('');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={availableVehicles.length === 0}>
          <LogOut className="mr-2 h-4 w-4" />
          Book Out Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Out Vehicle</DialogTitle>
          <DialogDescription>{actorName} is capturing departure details for a vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle</label>
            <select
              value={vehicleId}
              onChange={(event) => {
                const nextId = event.target.value;
                setVehicleId(nextId);
                const match = availableVehicles.find((item) => item.id === nextId);
                if (match) setBookedOutOdometer(match.currentOdometer);
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Choose a vehicle</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Book Out Odometer</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={bookedOutOdometer}
              onChange={(event) => setBookedOutOdometer(Number(event.target.value))}
              placeholder={selectedVehicle ? `${selectedVehicle.currentOdometer}` : '0'}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose</label>
              <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Site visit, delivery..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional trip notes..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!vehicleId || purpose.trim().length === 0}
            onClick={() => {
              onBookOut({
                vehicleId,
                bookedOutOdometer,
                purpose: purpose.trim(),
                destination: destination.trim(),
                notes: notes.trim(),
              });
              setIsOpen(false);
              reset();
            }}
          >
            Confirm Book Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookInDialog({
  usageRecord,
  actorName,
  onBookIn,
}: {
  usageRecord: VehicleUsageLite;
  actorName: string;
  onBookIn: (payload: { usageId: string; bookedInOdometer: number; returnNotes: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookedInOdometer, setBookedInOdometer] = useState(usageRecord.bookedOutOdometer);
  const [returnNotes, setReturnNotes] = useState('');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setBookedInOdometer(usageRecord.bookedOutOdometer);
          setReturnNotes(usageRecord.returnNotes || '');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <LogIn className="mr-2 h-4 w-4" />
          Book In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book In {usageRecord.vehicleRegistrationNumber}</DialogTitle>
          <DialogDescription>{actorName} is closing this active trip.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Book In Odometer</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={bookedInOdometer}
              onChange={(event) => setBookedInOdometer(Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">Booked out at {usageRecord.bookedOutOdometer.toFixed(0)} km</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Return Notes</label>
            <Textarea value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={bookedInOdometer < usageRecord.bookedOutOdometer}
            onClick={() => {
              onBookIn({
                usageId: usageRecord.id,
                bookedInOdometer,
                returnNotes: returnNotes.trim(),
              });
              setIsOpen(false);
            }}
          >
            Confirm Book In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VehicleUsagePage() {
  const { userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();
  const actorName = getPersonName(userProfile?.firstName, userProfile?.lastName, userProfile?.email);
  const canManageVehicleUsage = hasPermission('operations-view') || hasPermission('assets-view');

  const [vehicles, setVehicles] = useState<VehicleLite[]>(DEFAULT_VEHICLES);
  const [usageRecords, setUsageRecords] = useState<VehicleUsageLite[]>([]);

  useEffect(() => {
    setVehicles(loadLocal<VehicleLite[]>('safeviate.vehicles', DEFAULT_VEHICLES));
    setUsageRecords(loadLocal<VehicleUsageLite[]>('safeviate.vehicle-usage', []));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safeviate.vehicles', JSON.stringify(vehicles));
    }
  }, [vehicles]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safeviate.vehicle-usage', JSON.stringify(usageRecords));
    }
  }, [usageRecords]);

  const sortedUsageRecords = useMemo(
    () => [...usageRecords].sort((a, b) => new Date(b.bookedOutAt).getTime() - new Date(a.bookedOutAt).getTime()),
    [usageRecords]
  );

  const activeUsageByVehicleId = useMemo(() => {
    const activeMap = new Map<string, VehicleUsageLite>();
    for (const record of sortedUsageRecords) {
      if (record.status === 'Booked Out' && !activeMap.has(record.vehicleId)) {
        activeMap.set(record.vehicleId, record);
      }
    }
    return activeMap;
  }, [sortedUsageRecords]);

  const activeVehicleIds = useMemo(() => new Set(activeUsageByVehicleId.keys()), [activeUsageByVehicleId]);

  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const bookedOutCount = activeVehicleIds.size;
    return {
      totalVehicles,
      bookedOutCount,
      availableCount: Math.max(totalVehicles - bookedOutCount, 0),
    };
  }, [vehicles, activeVehicleIds]);

  const handleBookOut = (payload: {
    vehicleId: string;
    bookedOutOdometer: number;
    purpose: string;
    destination: string;
    notes: string;
  }) => {
    const vehicle = vehicles.find((item) => item.id === payload.vehicleId);
    if (!vehicle) return;

    const timestamp = new Date().toISOString();
    const usage: VehicleUsageLite = {
      id: crypto.randomUUID(),
      vehicleId: vehicle.id,
      vehicleRegistrationNumber: vehicle.registrationNumber,
      vehicleLabel: `${vehicle.make} ${vehicle.model}`.trim(),
      status: 'Booked Out',
      bookedOutAt: timestamp,
      bookedOutByName: actorName,
      bookedOutOdometer: payload.bookedOutOdometer,
      purpose: payload.purpose,
      destination: payload.destination,
      notes: payload.notes,
      bookedInAt: null,
      bookedInByName: null,
      bookedInOdometer: null,
      returnNotes: '',
    };

    setUsageRecords([usage, ...usageRecords]);
    setVehicles(
      vehicles.map((item) =>
        item.id === vehicle.id ? { ...item, currentOdometer: payload.bookedOutOdometer } : item
      )
    );
  };

  const handleBookIn = (payload: { usageId: string; bookedInOdometer: number; returnNotes: string }) => {
    const target = usageRecords.find((record) => record.id === payload.usageId);
    if (!target) return;

    setUsageRecords(
      usageRecords.map((record) =>
        record.id === payload.usageId
          ? {
              ...record,
              status: 'Booked In',
              bookedInAt: new Date().toISOString(),
              bookedInByName: actorName,
              bookedInOdometer: payload.bookedInOdometer,
              returnNotes: payload.returnNotes,
            }
          : record
      )
    );

    setVehicles(
      vehicles.map((vehicle) =>
        vehicle.id === target.vehicleId ? { ...vehicle, currentOdometer: payload.bookedInOdometer } : vehicle
      )
    );
  };

  if (!vehicles) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
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
            canManageVehicleUsage ? (
              <BookOutDialog
                vehicles={vehicles}
                activeVehicleIds={activeVehicleIds}
                actorName={actorName}
                onBookOut={handleBookOut}
              />
            ) : undefined
          }
        />
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 bg-background">
          <div className="h-full overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription className="text-foreground/80">Total Vehicles</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalVehicles}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none border-border bg-muted/40">
                <CardHeader className="pb-2">
                  <CardDescription className="text-foreground/80">Currently Booked Out</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{stats.bookedOutCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none border-border bg-muted/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-foreground/80">Available Now</CardDescription>
                  <CardTitle className="text-3xl text-foreground">{stats.availableCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((vehicle) => {
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
                      <div className="flex items-center gap-2 text-foreground/80">
                        <CarFront className="h-4 w-4" />
                        <span>{vehicle.type || 'Vehicle'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Clock3 className="h-4 w-4" />
                        <span>Current odometer: {vehicle.currentOdometer.toFixed(0)} km</span>
                      </div>
                      {activeRecord ? (
                        <div className="rounded-lg border bg-background p-3 space-y-2">
                          <div className="flex items-center gap-2 font-medium">
                            <LogOut className="h-4 w-4 text-primary" />
                            Active usage
                          </div>
                          <p className="text-foreground/80">
                            Out by {activeRecord.bookedOutByName} on {format(new Date(activeRecord.bookedOutAt), 'dd MMM yyyy HH:mm')}
                          </p>
                          <p className="text-foreground/80">Purpose: {activeRecord.purpose || 'Not specified'}</p>
                          <p className="text-foreground/80">Destination: {activeRecord.destination || 'Not specified'}</p>
                          {canManageVehicleUsage ? (
                            <BookInDialog usageRecord={activeRecord} actorName={actorName} onBookIn={handleBookIn} />
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
                  <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Plus className="h-5 w-5" />
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
