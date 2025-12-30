

'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { AlertCircle, PlusCircle, Save, Trash2, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

const stationSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name is required'),
  weight: z.number().min(0, 'Weight must be positive'),
  arm: z.number(),
  type: z.enum(['weight', 'fuel']),
  gallons: z.number().optional(),
  maxGallons: z.number().optional(),
});

type StationFormValues = z.infer<typeof stationSchema>;

// Helper to convert station name to camelCase
const toCamelCase = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
};


export function MassBalanceCalculator({ aircraft, profile }: { aircraft: Aircraft; profile: AircraftModelProfile }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const tenantId = 'safeviate';

  const [stations, setStations] = useState<Station[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalMoment, setTotalMoment] = useState(0);
  const [centerOfGravity, setCenterOfGravity] = useState(0);
  const [isWithinLimits, setIsWithinLimits] = useState(false);
  const [isNewProfileDialogOpen, setIsNewProfileDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');


  useEffect(() => {
    const initialStations = profile.stations.map(station => ({
      ...station,
      weight: 0,
      gallons: station.type === 'fuel' ? 0 : undefined
    }));
    setStations(initialStations);
  }, [profile]);

  useEffect(() => {
    const { emptyWeight = 0, emptyWeightMoment = 0 } = aircraft;
    let currentWeight = emptyWeight;
    let currentMoment = emptyWeightMoment;

    stations.forEach(station => {
      currentWeight += station.weight;
      currentMoment += station.weight * station.arm;
    });

    setTotalWeight(currentWeight);
    setTotalMoment(currentMoment);

    const cg = currentWeight > 0 ? currentMoment / currentWeight : 0;
    setCenterOfGravity(cg);

    // Check envelope
    if (profile.cgEnvelope && profile.cgEnvelope.length > 0) {
      const point = { x: cg, y: currentWeight };
      setIsWithinLimits(isPointInPolygon(point, profile.cgEnvelope));
    } else {
        setIsWithinLimits(true); // No envelope defined, assume it's within limits
    }
  }, [stations, aircraft]);

  const handleWeightChange = (index: number, newWeight: number) => {
    const newStations = [...stations];
    newStations[index].weight = newWeight;

    // If it's a fuel station, update gallons as well
    if (newStations[index].type === 'fuel') {
      newStations[index].gallons = parseFloat((newWeight / FUEL_WEIGHT_PER_GALLON).toFixed(2));
    }
    setStations(newStations);
  };
  
  const handleGallonsChange = (index: number, newGallons: number) => {
    const newStations = [...stations];
    const maxGallons = newStations[index].maxGallons || Infinity;
    const clampedGallons = Math.min(newGallons, maxGallons);

    newStations[index].gallons = clampedGallons;
    newStations[index].weight = parseFloat((clampedGallons * FUEL_WEIGHT_PER_GALLON).toFixed(2));
    setStations(newStations);
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
    
    // Correctly create a flat object with camelCase keys
    const massAndBalanceData = stations.reduce((acc, station) => {
        const key = toCamelCase(station.name);
        acc[key] = {
            weight: station.weight,
            moment: station.weight * station.arm,
        };
        return acc;
    }, {} as { [key: string]: { weight: number, moment: number } });

    const dataToSave = {
        massAndBalance: massAndBalanceData,
    };

    updateDocumentNonBlocking(bookingRef, dataToSave);

    toast({
        title: "Saved to Booking",
        description: "The mass and balance has been saved to the booking.",
    });
  };

  const handleSaveAsNewProfile = () => {
    if (!firestore || !newProfileName.trim()) {
        toast({ variant: "destructive", title: "Name Required", description: "Please enter a name for the new profile." });
        return;
    }

    const newProfile: Omit<AircraftModelProfile, 'id'> = {
        profileName: newProfileName,
        stations: stations.map(({ id, name, arm, type, maxGallons }) => ({ // Only save the structure, not the weights/gallons
          id,
          name,
          arm,
          type,
          maxGallons,
          weight: 0
        })),
        cgEnvelope: profile.cgEnvelope,
        xMin: profile.xMin,
        xMax: profile.xMax,
        yMin: profile.yMin,
        yMax: profile.yMax,
    };

    const profilesCollection = collection(firestore, 'tenants', tenantId, 'massAndBalance');
    addDocumentNonBlocking(profilesCollection, newProfile);
    
    toast({ title: 'Profile Saved', description: `New M&B profile "${newProfileName}" has been created.` });
    setIsNewProfileDialogOpen(false);
    setNewProfileName('');
  }

  const addStation = () => {
    setStations([
      ...stations,
      { id: stations.length, name: 'New Station', weight: 0, arm: 0, type: 'weight' },
    ]);
  };

  const removeStation = (index: number) => {
    const newStations = stations.filter((_, i) => i !== index);
    setStations(newStations);
  };
  
  const handleStationFieldChange = (index: number, field: keyof Station, value: any) => {
    const newStations = [...stations];
    const station = newStations[index];
    (station as any)[field] = value;
    setStations(newStations);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Loading Stations</CardTitle>
          <CardDescription>Enter weights and fuel quantities for your flight.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Station</TableHead>
                <TableHead>Weight (lbs)</TableHead>
                <TableHead>Arm</TableHead>
                <TableHead>Moment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Basic Empty Weight</TableCell>
                <TableCell>{aircraft.emptyWeight?.toFixed(2)}</TableCell>
                <TableCell>{aircraft.emptyWeight && aircraft.emptyWeightMoment ? (aircraft.emptyWeightMoment / aircraft.emptyWeight).toFixed(2) : 'N/A'}</TableCell>
                <TableCell>{aircraft.emptyWeightMoment?.toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              {stations.map((station, index) => (
                <TableRow key={station.id}>
                  <TableCell>
                      <Input value={station.name} onChange={e => handleStationFieldChange(index, 'name', e.target.value)} className="font-medium bg-transparent border-0 pl-0 focus-visible:ring-1" />
                  </TableCell>
                  <TableCell>
                    {station.type === 'fuel' ? (
                       <div className="flex items-center gap-2">
                           <Input
                               type="number"
                               value={station.gallons}
                               onChange={(e) => handleGallonsChange(index, parseFloat(e.target.value))}
                               className="w-24"
                               max={station.maxGallons}
                           />
                           <span className="text-muted-foreground text-xs">gal</span>
                       </div>
                    ) : (
                       <Input
                           type="number"
                           value={station.weight}
                           onChange={(e) => handleWeightChange(index, parseFloat(e.target.value))}
                           className="w-24"
                       />
                    )}
                  </TableCell>
                  <TableCell>
                      <Input type="number" value={station.arm} onChange={e => handleStationFieldChange(index, 'arm', parseFloat(e.target.value))} className="w-24 bg-transparent border-0 pl-0 focus-visible:ring-1" />
                  </TableCell>
                  <TableCell>{(station.weight * station.arm).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeStation(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" onClick={addStation} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Station
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Dialog open={isNewProfileDialogOpen} onOpenChange={setIsNewProfileDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Save as new profile</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save New M&B Profile</DialogTitle>
                    <DialogDescription>
                        Save the current station layout (names, arms, fuel types) as a new reusable template. Weights will not be saved.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="profile-name">New Profile Name</Label>
                    <Input id="profile-name" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="e.g., C172 - IFR Config" />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveAsNewProfile}>Save Profile</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
           <Button onClick={handleSaveToBooking} disabled={!bookingId}>
              <Save className="mr-2 h-4 w-4" /> Save to Booking
           </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Calculated totals and center of gravity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total Weight</p>
                    <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                </div>
                 <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total Moment</p>
                    <p className="text-2xl font-bold">{totalMoment.toFixed(2)}</p>
                </div>
            </div>
            <div className={cn(
                "p-4 rounded-lg text-center transition-colors",
                isWithinLimits ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
            )}>
                 <p className="text-sm">Center of Gravity</p>
                 <p className="text-3xl font-bold tracking-tight">{centerOfGravity.toFixed(2)}</p>
                 <p className="text-xs font-semibold uppercase">{isWithinLimits ? 'Within Limits' : 'Out of Limits'}</p>
            </div>
            <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={[{ name: 'CG', value: centerOfGravity }]}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: -20, bottom: 20 }}
                        barCategoryGap={0}
                    >
                        <XAxis 
                            type="number" 
                            domain={[profile.xMin || 80, profile.xMax || 95]} 
                            tickCount={8} 
                            axisLine={false} 
                            tickLine={false}
                        />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                         {profile.cgEnvelope && profile.cgEnvelope.length > 0 && (
                            <ReferenceLine
                                x={profile.cgEnvelope[0].x}
                                stroke="blue"
                                strokeDasharray="3 3"
                                label={{ value: 'FWD Limit', position: 'insideBottom', fill: 'blue' }}
                            />
                        )}
                        {profile.cgEnvelope && profile.cgEnvelope.length > 1 && (
                            <ReferenceLine
                                x={profile.cgEnvelope[1].x}
                                stroke="blue"
                                strokeDasharray="3 3"
                                label={{ value: 'AFT Limit', position: 'insideBottom', fill: 'blue' }}
                            />
                        )}
                        <Bar dataKey="value" fill="#8884d8" barSize={30}>
                             <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(value: number) => value.toFixed(2)}
                                fill="#fff"
                                className="font-semibold"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
