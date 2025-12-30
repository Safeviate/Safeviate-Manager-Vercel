
'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, FileJson, Save } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Aircraft } from '../../assets/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { isPointInPolygon } from '@/lib/utils';
import type { Booking } from '@/types/booking';

type Station = {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'static' | 'editable' | 'fuel';
  gallons?: number;
  maxGallons?: number;
};

const toCamelCase = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
};


export default function MassBalanceCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const aircraftId = searchParams.get('aircraftId');
  const bookingId = searchParams.get('bookingId');
  const tenantId = 'safeviate'; // Hardcoded for now

  const [stations, setStations] = useState<Station[]>([]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(100);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(2500);

  // --- Data Fetching ---
  const aircraftRef = useMemoFirebase(
    () => (firestore && aircraftId ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  useEffect(() => {
    if (aircraft) {
      const initialStations: Station[] = [
        { id: 0, name: 'Basic Empty Weight', weight: aircraft.emptyWeight || 0, arm: aircraft.emptyWeightMoment ? (aircraft.emptyWeightMoment / (aircraft.emptyWeight || 1)) : 0, type: 'static' },
      ];
      if (aircraft.stationArms?.frontSeats) {
        initialStations.push({ id: 1, name: 'Front Seats', weight: 0, arm: aircraft.stationArms.frontSeats, type: 'editable' });
      }
      if (aircraft.stationArms?.rearSeats) {
        initialStations.push({ id: 2, name: 'Rear Seats', weight: 0, arm: aircraft.stationArms.rearSeats, type: 'editable' });
      }
      if (aircraft.stationArms?.baggage1) {
        initialStations.push({ id: 3, name: 'Baggage Area 1', weight: 0, arm: aircraft.stationArms.baggage1, type: 'editable' });
      }
      if (aircraft.stationArms?.baggage2) {
        initialStations.push({ id: 4, name: 'Baggage Area 2', weight: 0, arm: aircraft.stationArms.baggage2, type: 'editable' });
      }
       if (aircraft.stationArms?.fuel) {
        initialStations.push({ id: 5, name: 'Fuel', weight: 0, arm: aircraft.stationArms.fuel, type: 'fuel', gallons: 0, maxGallons: 50 }); // Assuming max 50 for now
      }

      setStations(initialStations);

      if (aircraft.cgEnvelope) {
        setCgEnvelope(aircraft.cgEnvelope.map(p => ({ x: p.cg, y: p.weight })));
        const xValues = aircraft.cgEnvelope.map(p => p.cg);
        const yValues = aircraft.cgEnvelope.map(p => p.weight);
        setXMin(Math.min(...xValues) - 5);
        setXMax(Math.max(...xValues) + 5);
        setYMin(Math.min(...yValues) - 200);
        setYMax(aircraft.maxTakeoffWeight || Math.max(...yValues) + 200);
      }
    }
  }, [aircraft]);


  // --- Calculations ---
  const totals = useMemo(() => {
    const totalWeight = stations.reduce((acc, station) => acc + station.weight, 0);
    const totalMoment = stations.reduce((acc, station) => acc + station.weight * station.arm, 0);
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    return { totalWeight, totalMoment, centerOfGravity };
  }, [stations]);

  const isWithinLimits = useMemo(() => {
    const point = { x: totals.centerOfGravity, y: totals.totalWeight };
    const maxWeight = aircraft?.maxTakeoffWeight;
    if (maxWeight && totals.totalWeight > maxWeight) {
        return false;
    }
    return isPointInPolygon(point, cgEnvelope);
  }, [totals, cgEnvelope, aircraft?.maxTakeoffWeight]);


  // --- Event Handlers ---
  const handleWeightChange = (id: number, newWeight: number) => {
    setStations(stations.map(s => (s.id === id ? { ...s, weight: newWeight } : s)));
  };
  
  const handleArmChange = (id: number, newArm: number) => {
    setStations(stations.map(s => (s.id === id ? { ...s, arm: newArm } : s)));
  };

  const handleGallonsChange = (id: number, gallons: number) => {
    setStations(stations.map(s => (s.id === id ? { ...s, gallons, weight: gallons * FUEL_WEIGHT_PER_GALLON } : s)));
  };

  const addStation = (type: 'editable' | 'fuel') => {
    const newId = stations.length > 0 ? Math.max(...stations.map(s => s.id)) + 1 : 0;
    setStations([...stations, { id: newId, name: 'New Station', weight: 0, arm: 0, type }]);
  };

  const removeStation = (id: number) => {
    setStations(stations.filter(s => s.id !== id));
  };
  
  const handleSaveToBooking = () => {
    if (!firestore || !bookingId) {
        toast({ variant: "destructive", title: "Error", description: "Booking not found or database not available." });
        return;
    }

    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const massAndBalanceData = stations.reduce((acc, station) => {
        const key = toCamelCase(station.name);
        acc[key] = {
            weight: station.weight,
            moment: station.weight * station.arm,
        };
        return acc;
    }, {} as Record<string, { weight: number, moment: number }>);
    

    updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });

    toast({
      title: "Saved to Booking",
      description: `Mass & Balance data has been saved to booking #${bookingId}.` // A real app would show the booking number
    });
  };

  if (isLoadingAircraft) {
      return <div className='space-y-6'>
          <Skeleton className='h-96 w-full' />
          <Skeleton className='h-64 w-full' />
      </div>
  }

  if (!aircraft) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Please select an aircraft to begin.</p>
        <p className="text-sm text-muted-foreground">(Add `?aircraftId=your-id` to the URL)</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Loading Stations & Totals */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Stations</CardTitle>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => addStation('fuel')}><FileJson className="mr-2 h-4 w-4" /> Add Fuel</Button>
                <Button variant="outline" size="sm" onClick={() => addStation('editable')}><Plus className="mr-2 h-4 w-4" /> Add</Button>
                {bookingId && <Button size="sm" onClick={handleSaveToBooking}><Save className="mr-2 h-4 w-4" /> Save to Booking</Button>}
            </div>
          </CardHeader>
          <CardContent>
            {stations.map(station => (
              <div key={station.id} className="grid grid-cols-[1fr,100px,100px,100px,auto] items-center gap-2 mb-2">
                <Input value={station.name} readOnly={station.type !== 'editable'} className={station.type === 'static' ? 'font-bold bg-muted' : ''} />
                <Input type="number" value={station.weight.toString()} onChange={(e) => handleWeightChange(station.id, parseFloat(e.target.value) || 0)} readOnly={station.type === 'static' || station.type === 'fuel'} />
                <Input type="number" value={station.arm.toString()} onChange={(e) => handleArmChange(station.id, parseFloat(e.target.value) || 0)} readOnly={station.type !== 'editable'} />
                <Input value={(station.weight * station.arm).toFixed(2)} readOnly className="bg-muted" />
                {station.type === 'editable' ? (
                  <Button variant="ghost" size="icon" onClick={() => removeStation(station.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : <div className="w-10"></div>}

                {station.type === 'fuel' && (
                    <div className="col-start-2 col-span-2 flex items-center gap-2 mt-1">
                        <Label>Gallons</Label>
                        <Input type="number" value={station.gallons?.toString()} onChange={e => handleGallonsChange(station.id, parseFloat(e.target.value) || 0)} />
                        <span className="text-sm text-muted-foreground">Max: {station.maxGallons}</span>
                    </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                 <div><Label>Total Weight (lbs)</Label><Input value={totals.totalWeight.toFixed(2)} readOnly /></div>
                 <div><Label>Total Moment (lbs-in)</Label><Input value={totals.totalMoment.toFixed(2)} readOnly /></div>
                 <div><Label>Center of Gravity (in)</Label><Input value={totals.centerOfGravity.toFixed(2)} readOnly /></div>
            </CardContent>
        </Card>
      </div>

      {/* Envelope Chart */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>CG Envelope</CardTitle>
           <CardDescription className={isWithinLimits ? 'text-green-600' : 'text-destructive'}>
            {isWithinLimits ? 'Within operational limits' : 'OUTSIDE operational limits'}
          </CardDescription>
        </CardHeader>
        <CardContent>
             <svg viewBox={`${xMin} ${yMin} ${xMax-xMin} ${yMax-yMin}`} className="w-full h-auto border rounded-lg">
                {/* Flip vertically */}
                <g transform={`scale(1, -1) translate(0, -${yMax + yMin})`}>
                    {/* Draw Polygon */}
                    <polygon points={cgEnvelope.map(p => `${p.x},${p.y}`).join(' ')} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                    
                    {/* Max takeoff weight line */}
                    {aircraft?.maxTakeoffWeight && (
                        <line x1={xMin} y1={aircraft.maxTakeoffWeight} x2={xMax} y2={aircraft.maxTakeoffWeight} stroke="red" strokeWidth="0.5" strokeDasharray="2 2" />
                    )}

                    {/* CG Point */}
                    <circle cx={totals.centerOfGravity} cy={totals.totalWeight} r="1" fill={isWithinLimits ? 'green' : 'red'} />
                </g>
            </svg>
        </CardContent>
      </Card>
    </div>
  );
}
