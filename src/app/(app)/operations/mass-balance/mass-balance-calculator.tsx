
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ZAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, isPointInPolygon } from '@/lib/utils';
import type { Aircraft } from '../../assets/page';
import type { Booking, MassAndBalance } from '@/types/booking';

interface MassBalanceCalculatorProps {
  aircraft: Aircraft;
  booking: Booking;
  tenantId: string;
  onSave: () => void;
}

interface Station {
  name: string;
  arm: number;
}

const stationsConfig: Station[] = [
    { name: 'Front Seats', arm: 37 },
    { name: 'Rear Seats', arm: 74 },
    { name: 'Fuel', arm: 48 },
    { name: 'Baggage Area 1', arm: 95 },
    { name: 'Baggage Area 2', arm: 123 },
];

export function MassBalanceCalculator({ aircraft, booking, tenantId, onSave }: MassBalanceCalculatorProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [stationWeights, setStationWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    setStationWeights(booking.massAndBalance?.stationWeights || {});
  }, [booking.massAndBalance]);

  const handleWeightChange = (stationName: string, weight: string) => {
    const numericWeight = parseFloat(weight);
    setStationWeights(prev => ({
      ...prev,
      [stationName]: isNaN(numericWeight) ? 0 : numericWeight,
    }));
  };

  const calculation = useMemo(() => {
    let totalWeight = aircraft.emptyWeight || 0;
    let totalMoment = aircraft.emptyWeightMoment || 0;

    const stationData = stationsConfig.map(station => {
      const weight = stationWeights[station.name] || 0;
      const moment = weight * station.arm;
      totalWeight += weight;
      totalMoment += moment;
      return { ...station, weight, moment };
    });

    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    
    const isWithinLimits = isPointInPolygon(
        { x: centerOfGravity, y: totalWeight },
        aircraft.cgEnvelope || []
    ) && totalWeight <= (aircraft.maxTakeoffWeight || Infinity);


    return {
      stationData,
      totalWeight,
      totalMoment,
      centerOfGravity,
      isWithinLimits,
    };
  }, [aircraft, stationWeights]);

  const handleSaveToBooking = async () => {
    if (!firestore) return;

    const mbData: MassAndBalance = {
      stationWeights,
      totalWeight: calculation.totalWeight,
      totalMoment: calculation.totalMoment,
      centerOfGravity: calculation.centerOfGravity,
      isWithinLimits: calculation.isWithinLimits,
      calculatedAt: new Date().toISOString(),
    };
    
    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
    
    try {
        await updateDocumentNonBlocking(bookingRef, { massAndBalance: mbData });
        toast({
            title: 'M&B Saved',
            description: 'Mass & Balance data has been saved to the booking.',
        });
        onSave();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'Could not save M&B data.',
        });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
      <Card>
        <CardHeader>
          <CardTitle>Weight & Balance Input</CardTitle>
          <CardDescription>Enter weights for each station in lbs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead className="w-32">Weight (lbs)</TableHead>
                <TableHead className="text-right">Arm (in)</TableHead>
                <TableHead className="text-right">Moment (lb-in)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-semibold bg-secondary/30">
                <TableCell>Basic Empty Weight</TableCell>
                <TableCell>{aircraft.emptyWeight?.toFixed(2)}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{aircraft.emptyWeightMoment?.toFixed(2)}</TableCell>
              </TableRow>
              {calculation.stationData.map(station => (
                <TableRow key={station.name}>
                  <TableCell>{station.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={stationWeights[station.name] || ''}
                      onChange={(e) => handleWeightChange(station.name, e.target.value)}
                      className="h-8"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="text-right">{station.arm}</TableCell>
                  <TableCell className="text-right">{station.moment.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-secondary/30 border-t-2">
                <TableCell>Total</TableCell>
                <TableCell>{calculation.totalWeight.toFixed(2)}</TableCell>
                <TableCell className="text-right">{calculation.centerOfGravity.toFixed(2)}</TableCell>
                <TableCell className="text-right">{calculation.totalMoment.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveToBooking}>Save to Booking</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <Alert variant={calculation.isWithinLimits ? 'default' : 'destructive'} className={cn(calculation.isWithinLimits && 'bg-green-50 border-green-200')}>
          {calculation.isWithinLimits ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle className={cn(calculation.isWithinLimits && 'text-green-800')}>{calculation.isWithinLimits ? 'Within Limits' : 'OUT OF LIMITS'}</AlertTitle>
          <AlertDescription className={cn(calculation.isWithinLimits && 'text-green-700')}>
            {calculation.isWithinLimits ? 'The aircraft is within all weight and balance limits.' : 'Check weights and distribution. Aircraft is not safe for flight.'}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Center of Gravity Envelope</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] p-0 pr-4 pb-4">
             <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="CG" 
                        unit=" in" 
                        domain={['dataMin - 1', 'dataMax + 1']}
                        label={{ value: "Center of Gravity (in)", position: "insideBottom", offset: -15 }}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Weight" 
                        unit=" lbs"
                        domain={['dataMin - 100', 'dataMax + 100']}
                        width={80}
                        label={{ value: "Weight (lbs)", angle: -90, position: "insideLeft", offset: -20 }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <ZAxis dataKey="z" range={[100, 100]} />
                    
                    {/* Envelope Polygon */}
                    <Scatter 
                        name="CG Envelope" 
                        data={aircraft.cgEnvelope || []} 
                        line={{ stroke: '#8884d8' }}
                        lineJointType="monotoneX"
                        fill="#8884d8"
                        shape={() => null} 
                    />

                    {/* Calculated Point */}
                    <Scatter 
                        name="Current Loading" 
                        data={[{ x: calculation.centerOfGravity, y: calculation.totalWeight, z: 1 }]} 
                        fill={calculation.isWithinLimits ? '#82ca9d' : '#ff4d4d'} 
                    />

                    <ReferenceLine y={aircraft.maxTakeoffWeight} label={{ value: `Max Takeoff: ${aircraft.maxTakeoffWeight} lbs`, position: 'insideTopRight' }} stroke="red" strokeDasharray="3 3" />
                </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
