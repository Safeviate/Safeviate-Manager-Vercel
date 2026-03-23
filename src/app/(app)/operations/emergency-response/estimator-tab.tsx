'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Compass, Fuel, Mountain, AlertTriangle, Info } from 'lucide-react';

export function EstimatorTab() {
  // Fuel State
  const [fuelOnBoard, setFuelOnBoard] = useState<number | string>(48);
  const [fuelBurnRate, setFuelBurnRate] = useState<number | string>(8.5);
  
  // Position/Search State
  const [lastGroundSpeed, setLastGroundSpeed] = useState<number | string>(100);
  const [minutesSinceContact, setMinutesSinceContact] = useState<number | string>(15);
  
  // Glide State
  const [altitude, setAltitude] = useState<number | string>(3500);
  const [glideRatio, setGlideRatio] = useState<number | string>(9); // Standard 9:1

  // --- Calculations ---
  
  // 1. Fuel Endurance
  const fuelEndurance = useMemo(() => {
    const fuel = Number(fuelOnBoard);
    const burn = Number(fuelBurnRate);
    if (!fuel || !burn || burn <= 0) return { hours: 0, minutes: 0, totalMinutes: 0 };
    
    const totalHours = fuel / burn;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return { hours, minutes, totalMinutes: Math.round(totalHours * 60) };
  }, [fuelOnBoard, fuelBurnRate]);

  // 2. Search Area Radius (Current)
  const currentSearchRadius = useMemo(() => {
    const gs = Number(lastGroundSpeed);
    const mins = Number(minutesSinceContact);
    if (!gs || !mins) return 0;
    return parseFloat(((gs * mins) / 60).toFixed(1));
  }, [lastGroundSpeed, minutesSinceContact]);

  // 3. Search Area Radius (Max possible based on fuel)
  const maxSearchRadius = useMemo(() => {
    const gs = Number(lastGroundSpeed);
    const remainingMins = fuelEndurance.totalMinutes;
    if (!gs || !remainingMins) return 0;
    return parseFloat(((gs * remainingMins) / 60).toFixed(1));
  }, [lastGroundSpeed, fuelEndurance]);

  // 4. Glide Distance (Nautical Miles)
  const glideDistance = useMemo(() => {
    const alt = Number(altitude);
    const ratio = Number(glideRatio);
    if (!alt || !ratio) return 0;
    // (Altitude / 6076) * ratio = NM
    return parseFloat(((alt / 6076) * ratio).toFixed(1));
  }, [altitude, glideRatio]);

  return (
    <div className="space-y-6">
      <div className="border-b px-6 py-6">
        <h3 className="font-headline text-2xl font-semibold">Safety &amp; Search Estimator</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mathematical tools to assist in determining emergency phases and potential search areas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <section className="border-b lg:border-r">
          <div className="border-b px-6 py-5">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" />
              <h4 className="text-lg font-semibold font-headline">Fuel Endurance & Exhaustion</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Determine how much time remains before fuel exhaustion.</p>
          </div>
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuel-qty">Fuel on Board (Gal/L)</Label>
                <Input id="fuel-qty" type="number" value={fuelOnBoard} onChange={(e) => setFuelOnBoard(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-burn">Burn Rate (per Hour)</Label>
                <Input id="fuel-burn" type="number" value={fuelBurnRate} onChange={(e) => setFuelBurnRate(e.target.value)} />
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-primary/5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Estimated Endurance</span>
              <div className="text-4xl font-black text-primary">
                {fuelEndurance.hours}h {fuelEndurance.minutes}m
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on current burn rate without reserve consideration.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-amber-900">
                <p className="font-bold uppercase">SAR Phase Note:</p>
                If fuel is considered exhausted, protocol dictates immediate escalation to <strong>DETRESFA</strong> (Distress).
              </div>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="border-b px-6 py-5">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h4 className="text-lg font-semibold font-headline">Potential Search Area</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Estimate the aircraft&apos;s travel distance since last contact.</p>
          </div>
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gs">Ground Speed (Knots)</Label>
                <Input id="gs" type="number" value={lastGroundSpeed} onChange={(e) => setLastGroundSpeed(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-since">Minutes Since Contact</Label>
                <Input id="time-since" type="number" value={minutesSinceContact} onChange={(e) => setMinutesSinceContact(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Current Radius</span>
                <div className="text-2xl font-bold">{currentSearchRadius} NM</div>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Max Radius (Fuel)</span>
                <div className="text-2xl font-bold text-red-600">{maxSearchRadius} NM</div>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-blue-50/50 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-900">
                The search radius is a circular area centered on the last known position. Use <strong>Max Radius</strong> to determine the absolute perimeter based on remaining fuel endurance.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden lg:col-span-2">
          <div className="border-b px-6 py-5">
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-primary" />
              <h4 className="text-lg font-semibold font-headline">Forced Landing: Glide Range</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Estimated maximum distance the aircraft can glide from a specified altitude.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alt">Last Known Altitude (Feet)</Label>
                  <Input id="alt" type="number" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="glide">Glide Ratio (Standard 9:1)</Label>
                  <Input id="glide" type="number" value={glideRatio} onChange={(e) => setGlideRatio(e.target.value)} />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col items-center justify-center p-8 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-200">
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-[0.2em] mb-2 block">Estimated Glide Range</span>
                  <div className="text-6xl font-black text-emerald-600 leading-none">
                    {glideDistance} <span className="text-xl font-bold tracking-normal">NM</span>
                  </div>
                  <p className="text-xs text-emerald-800/70 mt-4 max-w-sm">
                    Calculated as zero-wind range. Actual range will be significantly reduced by headwinds or increased by tailwinds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
