
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Polygon } from 'recharts';
import { PlusCircle, Trash2, Save, ArrowRight, FolderDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

// --- Type Definitions ---

const stationSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required"),
  weight: z.number({ coerce: true }).min(0, "Must be non-negative"),
  arm: z.number({ coerce: true }),
  type: z.enum(['weight', 'fuel']),
  gallons: z.number({ coerce: true }).optional(),
  maxGallons: z.number().optional(),
});

type StationFormValues = z.infer<typeof stationSchema>;

const ZodAircraftModelProfile = z.object({
  id: z.string().optional(),
  profileName: z.string().min(1, "Profile name is required"),
  stations: z.array(stationSchema),
  cgEnvelope: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    xMin: z.number({ coerce: true }).optional(),
    xMax: z.number({ coerce: true }).optional(),
    yMin: z.number({ coerce: true }).optional(),
    yMax: z.number({ coerce: true }).optional(),
});

// --- Helper Functions ---

const camelCase = (str: string) => {
    if (!str) return '';
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
    ).replace(/\s+/g, '');
};


// --- Main Component ---

interface MassBalanceCalculatorProps {
  aircraft: Aircraft;
  profile?: AircraftModelProfile | null;
  onProfileSave: (profileData: Omit<AircraftModelProfile, 'id'>) => void;
  bookingId?: string | null;
  tenantId: string;
}

export function MassBalanceCalculator({ aircraft, profile, onProfileSave, bookingId, tenantId }: MassBalanceCalculatorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [stations, setStations] = useState<Station[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalMoment, setTotalMoment] = useState(0);
  const [centerOfGravity, setCenterOfGravity] = useState(0);
  const [isWithinLimits, setIsWithinLimits] = useState(false);
  const [isNewProfileDialogOpen, setIsNewProfileDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    if (profile) {
      setStations(profile.stations);
    } else {
      // Default stations if no profile exists
      setStations([
        { id: 1, name: 'Basic Empty Weight', weight: aircraft.emptyWeight || 0, arm: (aircraft.emptyWeightMoment && aircraft.emptyWeight) ? aircraft.emptyWeightMoment / aircraft.emptyWeight : 0, type: 'weight' },
        { id: 2, name: 'Front Seats', weight: 0, arm: aircraft.stationArms?.frontSeats || 0, type: 'weight' },
        { id: 3, name: 'Rear Seats', weight: 0, arm: aircraft.stationArms?.rearSeats || 0, type: 'weight' },
        { id: 4, name: 'Fuel', weight: 0, arm: aircraft.stationArms?.fuel || 0, type: 'fuel', gallons: 0, maxGallons: 50 },
        { id: 5, name: 'Baggage 1', weight: 0, arm: aircraft.stationArms?.baggage1 || 0, type: 'weight' },
      ]);
    }
  }, [profile, aircraft]);
  
  useEffect(() => {
    const newTotalWeight = stations.reduce((acc, station) => acc + (station.weight || 0), 0);
    const newTotalMoment = stations.reduce((acc, station) => acc + (station.weight || 0) * (station.arm || 0), 0);
    const newCg = newTotalWeight > 0 ? newTotalMoment / newTotalWeight : 0;
    
    setTotalWeight(newTotalWeight);
    setTotalMoment(newTotalMoment);
    setCenterOfGravity(newCg);

    if (profile?.cgEnvelope && profile.cgEnvelope.length > 2) {
      setIsWithinLimits(isPointInPolygon({ x: newCg, y: newTotalWeight }, profile.cgEnvelope));
    } else {
        setIsWithinLimits(true); // Default to true if no envelope is defined
    }
  }, [stations, profile]);


  const handleStationChange = (id: number, field: keyof Station, value: any) => {
    setStations(prevStations =>
      prevStations.map(station => {
        if (station.id === id) {
          const updatedStation = { ...station, [field]: value };
          if (field === 'gallons' && station.type === 'fuel') {
            updatedStation.weight = value * FUEL_WEIGHT_PER_GALLON;
          }
          if (field === 'weight' && station.type === 'fuel') {
            updatedStation.gallons = value / FUEL_WEIGHT_PER_GALLON;
          }
          return updatedStation;
        }
        return station;
      })
    );
  };
  
  const handleSaveToBooking = () => {
    if (!firestore || !bookingId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No booking is being referenced.",
        });
        return;
    }

    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', bookingId);
    
    const weights = stations.reduce((acc, station) => {
        acc[station.id] = {
            weight: station.weight,
            moment: station.weight * station.arm,
        };
        return acc;
    }, {} as { [key: number]: { weight: number, moment: number } });

    const dataToSave = {
        massAndBalance: {
            calculatedAt: new Date().toISOString(),
            centerOfGravity: centerOfGravity,
            isWithinLimits: isWithinLimits,
            weights, // Changed from stationWeights to weights
        }
    };

    updateDocumentNonBlocking(bookingRef, dataToSave);

    toast({
        title: "Saved to Booking",
        description: "The mass and balance has been saved to the booking.",
    });
  };

  const handleSaveAsProfile = () => {
    if (!newProfileName.trim()) {
        toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter a name for the new profile.' });
        return;
    }

    const profileData = {
      profileName: newProfileName,
      stations: stations,
      cgEnvelope: profile?.cgEnvelope,
      xMin: profile?.xMin,
      xMax: profile?.xMax,
      yMin: profile?.yMin,
      yMax: profile?.yMax,
    };
    onProfileSave(profileData);
    setIsNewProfileDialogOpen(false);
    setNewProfileName('');
    toast({ title: 'Profile Saved', description: `Profile "${newProfileName}" has been created.` });
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mass & Balance Calculator</CardTitle>
          <CardDescription>
            For aircraft {aircraft.tailNumber}. All weights in lbs, arms in inches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Station</TableHead>
                <TableHead>Weight (lbs)</TableHead>
                {stations.some(s => s.type === 'fuel') && <TableHead>Gallons</TableHead>}
                <TableHead>Arm (in)</TableHead>
                <TableHead>Moment (lb-in)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map(station => (
                <TableRow key={station.id}>
                  <TableCell className="font-medium">{station.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={station.weight.toFixed(2)}
                      onChange={e => handleStationChange(station.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-28"
                      disabled={station.type === 'fuel' || station.name === 'Basic Empty Weight'}
                    />
                  </TableCell>
                  {stations.some(s => s.type === 'fuel') && (
                    <TableCell>
                      {station.type === 'fuel' ? (
                        <Input
                          type="number"
                          value={station.gallons?.toFixed(2) || 0}
                          onChange={e => handleStationChange(station.id, 'gallons', parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  <TableCell>{station.arm.toFixed(2)}</TableCell>
                  <TableCell>{(station.weight * station.arm).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Weight</p>
                    <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Moment</p>
                    <p className="text-2xl font-bold">{totalMoment.toFixed(2)}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Center of Gravity</p>
                    <p className="text-2xl font-bold">{centerOfGravity.toFixed(2)} in</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg flex flex-col justify-center" style={{ backgroundColor: isWithinLimits ? '#d4edda' : '#f8d7da', color: isWithinLimits ? '#155724' : '#721c24' }}>
                    <p className="text-sm">Status</p>
                    <p className="text-2xl font-bold">{isWithinLimits ? 'Within Limits' : 'Out of Limits'}</p>
                </div>
          </div>
           <div className="flex gap-2 self-end">
                <Dialog open={isNewProfileDialogOpen} onOpenChange={setIsNewProfileDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary"><Save className="mr-2"/>Save as new profile</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save New Profile</DialogTitle>
                            <DialogDescription>Save the current station weights as a new, reusable M&B profile.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input 
                                placeholder="Enter profile name..."
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleSaveAsProfile}>Save Profile</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button onClick={handleSaveToBooking} disabled={!bookingId}>
                  <ArrowRight className="mr-2"/>Save to Booking
                </Button>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}
