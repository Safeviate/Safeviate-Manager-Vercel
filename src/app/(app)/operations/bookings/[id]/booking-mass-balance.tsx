'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Aircraft } from '@/app/(app)/assets/page';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Fuel } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { cn, isPointInPolygon } from '@/lib/utils';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Label as RechartsLabel,
    ReferenceDot,
    Cell,
  } from 'recharts';

interface BookingMassBalanceProps {
  aircraft: Aircraft;
}

const POINT_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#eab308',
    '#a855f7',
    '#ec4899',
    '#f97316',
    '#06b6d4',
    '#84cc16',
];
  
export function BookingMassBalance({ aircraft }: BookingMassBalanceProps) {
  const [stations, setStations] = useState<any[]>([]);
  const [basicEmpty, setBasicEmpty] = useState({ weight: 0, moment: 0, arm: 0 });
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (aircraft) {
        setBasicEmpty({
            weight: aircraft.emptyWeight || 0,
            moment: aircraft.emptyWeightMoment || 0,
            arm: (aircraft.emptyWeight && aircraft.emptyWeight > 0) ? (aircraft.emptyWeightMoment || 0) / aircraft.emptyWeight : 0,
        });

        const reconstructedStations: any[] = [];
        if (aircraft.stationArms) {
            if(aircraft.stationArms.frontSeats) reconstructedStations.push({ id: Date.now() + 1, name: 'Front Seats', arm: aircraft.stationArms.frontSeats, weight: 0, type: 'standard' });
            if(aircraft.stationArms.rearSeats) reconstructedStations.push({ id: Date.now() + 2, name: 'Rear Seats', arm: aircraft.stationArms.rearSeats, weight: 0, type: 'standard' });
            if(aircraft.stationArms.baggage1) reconstructedStations.push({ id: Date.now() + 3, name: 'Baggage 1', arm: aircraft.stationArms.baggage1, weight: 0, type: 'standard' });
            if(aircraft.stationArms.baggage2) reconstructedStations.push({ id: Date.now() + 4, name: 'Baggage 2', arm: aircraft.stationArms.baggage2, weight: 0, type: 'standard' });
            // Assume max 50 gal for fuel if not specified
            if(aircraft.stationArms.fuel) reconstructedStations.push({ id: Date.now() + 5, name: 'Fuel', arm: aircraft.stationArms.fuel, weight: 0, type: 'fuel', gallons: 0, maxGallons: 50 });
        }
        setStations(reconstructedStations);

        const envelope = (aircraft.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
        setCgEnvelope(envelope);
    }
  }, [aircraft]);

  useEffect(() => {
    let totalMom = parseFloat(String(basicEmpty.moment)) || 0;
    let totalWt = parseFloat(String(basicEmpty.weight)) || 0;

    stations.forEach((st) => {
      const wt = parseFloat(st.weight) || 0;
      const arm = parseFloat(st.arm) || 0;
      totalWt += wt;
      totalMom += wt * arm;
    });

    const cg = totalWt > 0 ? totalMom / totalWt : 0;
    const safe = cgEnvelope.length > 2 ? isPointInPolygon({ x: cg, y: totalWt }, cgEnvelope) : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe,
    });
  }, [stations, basicEmpty, cgEnvelope]);

  const updateStation = (id: number, field: string, value: string | number) => {
    setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const handleFuelChange = (id: number, field: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(
      stations.map((s) => {
        if (s.id !== id) return s;

        if (field === 'gallons') {
            const finalGallons = Math.min(val, s.maxGallons || val);
            return { ...s, gallons: finalGallons, weight: finalGallons * FUEL_WEIGHT_PER_GALLON };
        }
        if (field === 'weight') {
            const calculatedGallons = parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1));
            const finalGallons = Math.min(calculatedGallons, s.maxGallons || calculatedGallons);
            const finalWeight = finalGallons * FUEL_WEIGHT_PER_GALLON;
            return {
                ...s,
                weight: finalWeight,
                gallons: finalGallons,
            };
        }
        return s;
      })
    );
  };

  const addStation = (type = 'standard') => {
    const newStation = {
      id: Date.now(),
      name: type === 'fuel' ? 'New Fuel Tank' : 'New Item',
      weight: 0,
      arm: 0,
      type: type,
      ...(type === 'fuel' ? { gallons: 0, maxGallons: 50 } : {}),
    };
    setStations([...stations, newStation]);
  };

  const removeStation = (id: number) => {
    setStations(stations.filter(s => s.id !== id));
  };

  const allX = useMemo(() => [...cgEnvelope.map(p => p.x), results.cg].filter(n => !isNaN(n)), [cgEnvelope, results.cg]);
  const allY = useMemo(() => [...cgEnvelope.map(p => p.y), results.weight].filter(n => !isNaN(n)), [cgEnvelope, results.weight]);
  const chartDomain = useMemo(() => {
    if (allX.length === 0 || allY.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 3000 };
    return {
        xMin: Math.floor(Math.min(...allX) - 2),
        xMax: Math.ceil(Math.max(...allX) + 2),
        yMin: Math.floor(Math.min(...allY) - 200),
        yMax: Math.ceil(Math.max(...allY) + 200),
    };
  }, [allX, allY]);

  if (!isClient) {
    return null; // or a skeleton loader
  }

  return (
    <Card className='relative'>
       <div className="absolute top-6 right-6 z-10">
          <div
            className={cn(
              'px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-2',
              results.isSafe
                ? 'bg-green-600/90 text-white'
                : 'bg-destructive text-white'
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                results.isSafe ? 'bg-white' : 'bg-white animate-pulse'
              )}
            ></div>
            <span className="text-xs">
              {results.isSafe ? 'WITHIN LIMITS' : 'OUT OF LIMITS'}
            </span>
          </div>
        </div>
      <CardHeader>
        <CardTitle>Interactive Graph</CardTitle>
        <CardDescription>Visualize the aircraft&apos;s center of gravity based on the configuration below.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[500px] flex flex-col justify-center items-center overflow-hidden pt-6">
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
              className="text-xs"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="CG"
                unit=" in"
                domain={[chartDomain.xMin, chartDomain.xMax]}
                allowDataOverflow={true}
                dy={10}
              >
                <RechartsLabel
                  value="CG (inches)"
                  offset={0}
                  position="insideBottom"
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                name="Weight"
                unit=" lbs"
                domain={[chartDomain.yMin, chartDomain.yMax]}
                allowDataOverflow={true}
                width={80}
              >
                <RechartsLabel
                  value="Gross Weight (lbs)"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                name="Envelope Line"
                data={cgEnvelope}
                fill="transparent"
                line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                shape={() => null}
                isAnimationActive={false}
              />
              <Scatter
                name="Envelope Points"
                data={cgEnvelope}
                isAnimationActive={false}
              >
                {cgEnvelope.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={POINT_COLORS[index % POINT_COLORS.length]}
                    stroke="hsl(var(--primary-foreground))"
                    strokeWidth={1}
                  />
                ))}
              </Scatter>
              <ReferenceDot
                x={results.cg}
                y={results.weight}
                r={8}
                fill={
                  results.isSafe
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--destructive))'
                }
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={2}
              >
                <RechartsLabel
                  value={`(${results.cg}, ${results.weight})`}
                  position="top"
                  fill="hsl(var(--foreground))"
                  fontSize="12"
                  offset={10}
                />
              </ReferenceDot>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-medium">Loading Stations</h3>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => addStation('fuel')}
                                variant="outline"
                                size="sm"
                                title="Add Fuel Tank"
                                type="button"
                            >
                                <Fuel size={16} className="mr-2" /> Add Fuel
                            </Button>
                            <Button
                                onClick={() => addStation('standard')}
                                variant="outline"
                                size="sm"
                                type="button"
                            >
                                <Plus size={16} className="mr-2" /> Add
                            </Button>
                        </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-1 mb-2">
                            <div className="col-span-5">Station Name</div>
                            <div className="col-span-3 text-right">Weight</div>
                            <div className="col-span-3 text-right">Arm</div>
                        </div>
                        <div className="space-y-2">
                        {/* Basic Empty Weight */}
                        <div className="grid grid-cols-12 gap-2 items-center text-sm">
                            <Input
                                value="Basic Empty Weight"
                                readOnly
                                disabled
                                className="col-span-5 h-8"
                            />
                            <Input
                                type="number"
                                value={basicEmpty.weight}
                                readOnly
                                disabled
                                className="text-right h-8 col-span-3"
                            />
                            <Input
                                type="number"
                                value={basicEmpty.arm.toFixed(2)}
                                readOnly
                                disabled
                                className="text-right h-8 col-span-3"
                            />
                        </div>
                        {/* Dynamic Stations */}
                        {stations.map((s) => (
                            <div key={s.id} className="group relative">
                            {s.type === 'fuel' ? (
                                <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5 flex items-center gap-2">
                                    <Input
                                        value={s.name}
                                        onChange={(e) =>
                                        updateStation(s.id, 'name', e.target.value)
                                        }
                                        className="text-sm font-bold h-8 flex-grow"
                                    />
                                    </div>
                                    <div className="col-span-3">
                                    <Input
                                        type="number"
                                        value={s.weight}
                                        onChange={(e) =>
                                        handleFuelChange(
                                            s.id,
                                            'weight',
                                            e.target.value
                                        )
                                        }
                                        className="text-sm text-right h-8"
                                    />
                                    </div>
                                    <div className="col-span-3">
                                    <Input
                                        type="number"
                                        value={s.arm}
                                        onChange={(e) =>
                                        handleFuelChange(s.id, 'arm', e.target.value)
                                        }
                                        className="text-sm text-right h-8"
                                        disabled
                                    />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                    <Button
                                        onClick={() => removeStation(s.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                                        type="button"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                    <Input
                                        value="Gallons"
                                        readOnly
                                        disabled
                                        className="text-xs text-muted-foreground h-8 col-span-2"
                                    />
                                    </div>
                                    <div className="col-span-3">
                                    <Input
                                        id={`gallons-${s.id}`}
                                        type="number"
                                        value={s.gallons || 0}
                                        onChange={(e) =>
                                        handleFuelChange(
                                            s.id,
                                            'gallons',
                                            e.target.value
                                        )
                                        }
                                        className="h-8 text-right"
                                    />
                                    </div>
                                    <div className="col-span-3 flex items-center gap-1">
                                    <Label
                                        htmlFor={`max-gallons-${s.id}`}
                                        className="text-xs text-muted-foreground flex-shrink-0"
                                    >
                                        Max:
                                    </Label>
                                    <Input
                                        id={`max-gallons-${s.id}`}
                                        type="number"
                                        value={s.maxGallons || 0}
                                        onChange={(e) =>
                                        updateStation(
                                            s.id,
                                            'maxGallons',
                                            e.target.value
                                        )
                                        }
                                        className="h-8 text-right flex-grow"
                                    />
                                    </div>
                                </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-5">
                                    <Input
                                    value={s.name}
                                    onChange={(e) =>
                                        updateStation(s.id, 'name', e.target.value)
                                    }
                                    placeholder="Item Name"
                                    className="h-8"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                    type="number"
                                    value={s.weight}
                                    onChange={(e) =>
                                        updateStation(s.id, 'weight', e.target.value)
                                    }
                                    className="text-right h-8"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                    type="number"
                                    value={s.arm}
                                    onChange={(e) =>
                                        updateStation(s.id, 'arm', e.target.value)
                                    }
                                    className="text-right h-8"
                                    disabled
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                    onClick={() => removeStation(s.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                                    type="button"
                                    >
                                    <Trash2 size={16} />
                                    </Button>
                                </div>
                                </div>
                            )}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
                {/* Right Column */}
                <div>
                  {/* Intentionally empty for this view */}
                </div>
            </div>
      </CardContent>
    </Card>
  );
}
