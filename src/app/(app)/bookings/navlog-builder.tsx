'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, NavlogLeg } from '@/types/booking';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Navigation, Wind, Gauge, Fuel, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { recalculateNavlogLegs, calculateRouteTotals, DEFAULT_FLIGHT_PARAMS } from '@/lib/flight-planner';
import type { FlightParams } from '@/lib/flight-planner';
import type { TrainingRoute } from '@/types/booking';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Library, Search } from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';
import { formatWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';

/** Weight of AVGAS per gallon in lbs */
const FUEL_WEIGHT_PER_GALLON = 6;

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
    /** Fuel weight in lbs from the M&B fuel station (for bi-directional sync) */
    fuelWeightLbs?: number;
    /** Callback when endurance changes — parent updates the M&B fuel station */
    onFuelWeightChange?: (weightLbs: number) => void;
}

/** Compact inline number input for per-leg overrides */
function InlineInput({
    value,
    onChange,
    placeholder,
    className = '',
    width = 'w-14',
}: {
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
    className?: string;
    width?: string;
}) {
    return (
        <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
                const raw = e.target.value;
                onChange(raw === '' ? undefined : parseFloat(raw));
            }}
            placeholder={placeholder}
            className={`h-6 px-1 text-[10px] font-bold text-center border-dashed ${width} ${className}`}
        />
    );
}

export function NavlogBuilder({ booking, tenantId, fuelWeightLbs, onFuelWeightChange }: NavlogBuilderProps) {
    const { toast } = useToast();
    const legs = booking.navlog?.legs || [];

    // Global flight parameters (initialize from saved navlog or defaults)
    const [params, setParams] = useState<FlightParams>({
        tas: booking.navlog?.globalTas ?? DEFAULT_FLIGHT_PARAMS.tas,
        windDirection: booking.navlog?.globalWindDirection ?? DEFAULT_FLIGHT_PARAMS.windDirection,
        windSpeed: booking.navlog?.globalWindSpeed ?? DEFAULT_FLIGHT_PARAMS.windSpeed,
        fuelBurnPerHour: booking.navlog?.globalFuelBurn ?? DEFAULT_FLIGHT_PARAMS.fuelBurnPerHour,
        fuelOnBoard: booking.navlog?.globalFuelOnBoard ?? DEFAULT_FLIGHT_PARAMS.fuelOnBoard,
    });
    const [fuelUnit, setFuelUnit] = useState<'GPH' | 'LPH'>(booking.navlog?.globalFuelBurnUnit ?? 'GPH');
    const [showPerLegWind, setShowPerLegWind] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [searchRoute, setSearchRoute] = useState('');

    const [trainingRoutes, setTrainingRoutes] = useState<TrainingRoute[]>([]);

    useEffect(() => {
        let cancelled = false;
        const loadRoutes = async () => {
            try {
                const response = await fetch('/api/training-routes', { cache: 'no-store' });
                const payload = await parseJsonResponse<{ routes?: TrainingRoute[] }>(response);
                if (!cancelled) {
                    setTrainingRoutes((payload?.routes ?? []).filter((route) => route.routeType !== 'other'));
                }
            } catch {
                if (!cancelled) setTrainingRoutes([]);
            }
        };
        void loadRoutes();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleImportRoute = async (route: TrainingRoute) => {
        try {
            const response = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: { ...booking, navlog: { ...(booking.navlog || {}), legs: route.legs, hazards: route.hazards } } }),
            });
            if (!response.ok) {
                throw new Error((await parseJsonResponse<{ error?: string }>(response))?.error || 'Failed to import route.');
            }
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            setIsImportOpen(false);
            toast({ title: 'Route Imported', description: route.name });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Import Failed', description: e instanceof Error ? e.message : 'Failed to import route.' });
        }
    };

    // ── Bi-directional fuel sync with M&B ──
    const syncSourceRef = useRef<'navlog' | 'mb' | null>(null);

    // When M&B fuel weight changes → update FOB in gallons
    useEffect(() => {
        if (fuelWeightLbs === undefined || syncSourceRef.current === 'navlog') {
            syncSourceRef.current = null;
            return;
        }
        const gallons = parseFloat((fuelWeightLbs / FUEL_WEIGHT_PER_GALLON).toFixed(1));
        if (Math.abs(gallons - params.fuelOnBoard) > 0.05) {
            syncSourceRef.current = 'mb';
            setParams(prev => ({ ...prev, fuelOnBoard: gallons }));
        }
    }, [fuelWeightLbs]);

    // When FOB changes → push fuel weight to M&B
    useEffect(() => {
        if (!onFuelWeightChange || syncSourceRef.current === 'mb') {
            syncSourceRef.current = null;
            return;
        }
        const weightLbs = parseFloat((params.fuelOnBoard * FUEL_WEIGHT_PER_GALLON).toFixed(1));
        syncSourceRef.current = 'navlog';
        onFuelWeightChange(weightLbs);
    }, [params.fuelOnBoard, onFuelWeightChange]);

    // Full E6B recalculation
    const calculatedLegs = useMemo(
        () => recalculateNavlogLegs(legs, params),
        [legs, params]
    );
    const totals = useMemo(
        () => calculateRouteTotals(calculatedLegs, params),
        [calculatedLegs, params]
    );

    const formatMinutes = (minutes: number): string => {
        if (!isFinite(minutes) || minutes <= 0) return '-';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m}`;
    };

    const handleRemoveLeg = async (legId: string) => {
        const updatedLegs = legs.filter((l) => l.id !== legId);
        try {
            const response = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: { ...booking, navlog: { ...(booking.navlog || {}), legs: updatedLegs } } }),
            });
            if (!response.ok) throw new Error((await parseJsonResponse<{ error?: string }>(response))?.error || 'Update failed');
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: 'Leg Removed' });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e instanceof Error ? e.message : 'Update failed.' });
        }
    };

    const handleUpdateLeg = useCallback(async (legId: string, updates: Partial<NavlogLeg>) => {
        const updatedLegs = legs.map((l) => (l.id === legId ? { ...l, ...updates } : l));
        try {
            const response = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: { ...booking, navlog: { ...(booking.navlog || {}), legs: updatedLegs } } }),
            });
            if (!response.ok) throw new Error((await parseJsonResponse<{ error?: string }>(response))?.error || 'Update failed');
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e instanceof Error ? e.message : 'Update failed.' });
        }
    }, [legs, booking, toast]);

    const handleSaveParams = async () => {
        try {
            const response = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        navlog: {
                            ...(booking.navlog || {}),
                            globalTas: params.tas,
                            globalWindDirection: params.windDirection,
                            globalWindSpeed: params.windSpeed,
                            globalFuelBurn: params.fuelBurnPerHour,
                            globalFuelBurnUnit: fuelUnit,
                            globalFuelOnBoard: params.fuelOnBoard,
                        },
                    },
                }),
            });
            if (!response.ok) throw new Error((await parseJsonResponse<{ error?: string }>(response))?.error || 'Save failed');
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: 'Flight Parameters Saved' });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e instanceof Error ? e.message : 'Save failed.' });
        }
    };

    if (legs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background min-h-full">
                <div className="max-w-md space-y-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Navigation className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-tight">Navlog Empty</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                            Use the Interactive Planner to build your flight route.
                        </p>
                    </div>
                    {(trainingRoutes?.length || 0) > 0 && (
                        <Button 
                          onClick={() => setIsImportOpen(true)}
                          variant="outline"
                          className="mt-4 h-9 bg-primary/5 border-primary/20 text-primary font-black uppercase text-[10px] gap-2"
                        >
                            <Library size={14} /> Import Training Route
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full bg-background overflow-hidden">
            {/* ── Global Flight Parameters Bar ── */}
            <div className="shrink-0 border-b bg-muted/20 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" /> Flight Parameters
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[9px] font-black uppercase"
                            onClick={() => setShowPerLegWind(!showPerLegWind)}
                        >
                            {showPerLegWind ? 'Hide Per-Leg Wind' : 'Per-Leg Wind'}
                        </Button>
                        <Separator orientation="vertical" className="h-4" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[9px] font-black uppercase"
                            onClick={() => setFuelUnit(fuelUnit === 'GPH' ? 'LPH' : 'GPH')}
                        >
                            {fuelUnit}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] font-black uppercase"
                            onClick={handleSaveParams}
                        >
                            Save
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Gauge className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[9px] font-black uppercase text-muted-foreground">TAS</span>
                        <Input
                            type="number"
                            value={params.tas}
                            onChange={(e) => setParams({ ...params, tas: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-16 text-xs font-bold text-center"
                        />
                        <span className="text-[9px] font-bold text-muted-foreground">KTS</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex items-center gap-2">
                        <Wind className="h-3.5 w-3.5 text-sky-500" />
                        <span className="text-[9px] font-black uppercase text-muted-foreground">Wind</span>
                        <Input
                            type="number"
                            value={params.windDirection}
                            onChange={(e) => setParams({ ...params, windDirection: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-14 text-xs font-bold text-center"
                        />
                        <span className="text-[9px] font-bold text-muted-foreground">° /</span>
                        <Input
                            type="number"
                            value={params.windSpeed}
                            onChange={(e) => setParams({ ...params, windSpeed: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-14 text-xs font-bold text-center"
                        />
                        <span className="text-[9px] font-bold text-muted-foreground">KTS</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex items-center gap-2">
                        <Fuel className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[9px] font-black uppercase text-muted-foreground">Burn</span>
                        <Input
                            type="number"
                            step="0.1"
                            value={params.fuelBurnPerHour}
                            onChange={(e) => setParams({ ...params, fuelBurnPerHour: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-16 text-xs font-bold text-center"
                        />
                        <span className="text-[9px] font-bold text-muted-foreground">{fuelUnit}</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex items-center gap-2">
                        <Fuel className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase text-muted-foreground">FOB</span>
                        <Input
                            type="number"
                            step="0.1"
                            value={params.fuelOnBoard}
                            onChange={(e) => setParams({ ...params, fuelOnBoard: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-16 text-xs font-bold text-center"
                        />
                        <span className="text-[9px] font-bold text-muted-foreground">{fuelUnit === 'GPH' ? 'GAL' : 'L'}</span>
                    </div>
                </div>
                {/* Derived endurance & reserve summary */}
                <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                    <span className="text-muted-foreground">
                        Endurance: <span className="text-foreground">{params.fuelBurnPerHour > 0 ? (params.fuelOnBoard / params.fuelBurnPerHour).toFixed(1) : '∞'} hrs</span>
                    </span>
                    <span className="text-muted-foreground">
                        Reserve: <span className={totals.fuelRemaining < 0 ? 'text-destructive' : 'text-emerald-600'}>{totals.enduranceRemaining.toFixed(1)} hrs ({totals.fuelRemaining.toFixed(1)} {fuelUnit === 'GPH' ? 'GAL' : 'L'})</span>
                    </span>
                </div>
            </div>

            {/* ── NavLog Table ── */}
            <div className="w-full overflow-x-auto flex-1">
                <Table className="min-w-[1400px]">
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow className="whitespace-nowrap">
                            <TableHead className="w-10 text-[9px] uppercase font-black px-3 whitespace-nowrap">#</TableHead>
                            <TableHead className="text-[9px] uppercase font-black whitespace-nowrap min-w-[180px]">Waypoint</TableHead>
                            <TableHead className="text-center text-[9px] uppercase font-black whitespace-nowrap w-16">ALT</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">TC°</TableHead>
                            {showPerLegWind && (
                                <>
                                    <TableHead className="text-center text-[9px] uppercase font-black whitespace-nowrap w-20">W/V</TableHead>
                                </>
                            )}
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">WCA</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">TH°</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">VAR</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">
                                <span className="text-primary">MH°</span>
                            </TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-14">DIST</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">GS</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">ETE</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-14">CUM</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-12">FUEL</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black whitespace-nowrap w-14">REM</TableHead>
                            <TableHead className="text-right text-[9px] uppercase font-black px-3 no-print whitespace-nowrap w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {calculatedLegs.map((leg, index) => {
                            const isFirstLeg = index === 0 && (leg.distance === undefined || leg.distance === 0);
                            const fuelRem = params.fuelOnBoard - calculatedLegs.slice(0, index + 1).reduce((s, l) => s + (l.tripFuel || 0), 0);
                            const lowFuel = fuelRem < (params.fuelBurnPerHour * 0.75); // 45 min reserve warning

                            return (
                                <TableRow
                                    key={leg.id}
                                    className="hover:bg-muted/5 transition-colors border-b last:border-b-0 whitespace-nowrap"
                                >
                                    {/* # */}
                                    <TableCell className="font-black text-[10px] text-muted-foreground px-3">
                                        {index + 1}
                                    </TableCell>

                                    {/* Waypoint */}
                                    <TableCell className="whitespace-nowrap align-top">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className="font-black text-xs uppercase text-foreground">
                                                {leg.waypoint}
                                            </span>
                                            <span className="text-[8px] font-mono font-bold text-muted-foreground">
                                                {formatWaypointCoordinatesDms(leg.latitude, leg.longitude)}
                                            </span>
                                            {leg.frequencies && (
                                                <span className="text-[8px] font-semibold text-emerald-700">
                                                    {leg.frequencies}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* ALT (editable) */}
                                    <TableCell className="text-center">
                                        <InlineInput
                                            value={leg.altitude}
                                            onChange={(v) => handleUpdateLeg(leg.id, { altitude: v })}
                                            placeholder="FL"
                                            width="w-16"
                                        />
                                    </TableCell>

                                    {/* TC° */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {isFirstLeg ? '-' : `${(leg.trueCourse ?? 0).toFixed(0)}°`}
                                    </TableCell>

                                    {/* Per-leg Wind Override */}
                                    {showPerLegWind && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center gap-0.5 justify-center">
                                                <InlineInput
                                                    value={legs[index]?.windDirection}
                                                    onChange={(v) => handleUpdateLeg(leg.id, { windDirection: v })}
                                                    placeholder={`${params.windDirection}`}
                                                    width="w-10"
                                                />
                                                <span className="text-[8px] text-muted-foreground">/</span>
                                                <InlineInput
                                                    value={legs[index]?.windSpeed}
                                                    onChange={(v) => handleUpdateLeg(leg.id, { windSpeed: v })}
                                                    placeholder={`${params.windSpeed}`}
                                                    width="w-10"
                                                />
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* WCA */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {isFirstLeg ? '-' : `${(leg.wca ?? 0) >= 0 ? '+' : ''}${(leg.wca ?? 0).toFixed(0)}°`}
                                    </TableCell>

                                    {/* TH° */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {isFirstLeg ? '-' : `${(leg.trueHeading ?? 0).toFixed(0)}°`}
                                    </TableCell>

                                    {/* VAR */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {(leg.variation ?? 0) >= 0 ? `${(leg.variation ?? 0).toFixed(0)}°E` : `${Math.abs(leg.variation ?? 0).toFixed(0)}°W`}
                                    </TableCell>

                                    {/* MH° (primary — highlighted) */}
                                    <TableCell className="text-right">
                                        <span className="font-mono text-sm font-black text-primary">
                                            {isFirstLeg ? '-' : `${(leg.magneticHeading ?? 0).toFixed(0)}°`}
                                        </span>
                                    </TableCell>

                                    {/* DIST */}
                                    <TableCell className="text-right font-mono text-[10px] font-black">
                                        {isFirstLeg ? '-' : (leg.distance ?? 0).toFixed(1)}
                                    </TableCell>

                                    {/* GS */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {isFirstLeg ? '-' : `${(leg.groundSpeed ?? 0).toFixed(0)}`}
                                    </TableCell>

                                    {/* ETE */}
                                    <TableCell className="text-right font-mono text-[10px] font-black">
                                        {isFirstLeg ? '-' : formatMinutes(leg.ete ?? 0)}
                                    </TableCell>

                                    {/* Cumulative ETE */}
                                    <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                                        {isFirstLeg ? '-' : formatMinutes(leg.cumulativeEte ?? 0)}
                                    </TableCell>

                                    {/* Fuel per leg */}
                                    <TableCell className="text-right font-mono text-[10px] font-black">
                                        {isFirstLeg ? '-' : (leg.tripFuel ?? 0).toFixed(1)}
                                    </TableCell>

                                    {/* Fuel Remaining */}
                                    <TableCell className={`text-right font-mono text-[10px] font-black ${lowFuel ? 'text-destructive' : ''}`}>
                                        {fuelRem.toFixed(1)}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right px-3 no-print">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveLeg(leg.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter className="bg-muted/20 border-t-2">
                        <TableRow className="whitespace-nowrap font-black">
                            <TableCell colSpan={showPerLegWind ? 5 : 4} className="text-[10px] uppercase tracking-widest px-3">
                                Totals
                            </TableCell>
                            {/* WCA, TH, VAR, MH — empty */}
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            {/* DIST total */}
                            <TableCell className="text-right font-mono text-[10px]">
                                {totals.distance.toFixed(1)} NM
                            </TableCell>
                            {/* Avg GS */}
                            <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                                {totals.groundSpeed > 0 ? `${totals.groundSpeed.toFixed(0)}` : '-'}
                            </TableCell>
                            {/* Total ETE */}
                            <TableCell className="text-right font-mono text-[10px]">
                                {formatMinutes(totals.ete)}
                            </TableCell>
                            {/* Cumulative = same as total */}
                            <TableCell />
                            {/* Total Fuel */}
                            <TableCell className="text-right font-mono text-[10px]">
                                {totals.fuel.toFixed(1)}
                            </TableCell>
                            {/* Reserve */}
                            <TableCell className={`text-right font-mono text-[10px] ${totals.fuelRemaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                {totals.fuelRemaining.toFixed(1)}
                            </TableCell>
                            <TableCell className="no-print" />
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Library className="h-4 w-4 text-primary" /> Import Training Route
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 border-b bg-muted/5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Search training routes..." 
                                className="h-8 pl-9 text-[10px] font-bold uppercase bg-background"
                                value={searchRoute}
                                onChange={e => setSearchRoute(e.target.value)}
                            />
                        </div>
                    </div>
                    <ScrollArea className="h-[400px]">
                        <div className="p-4 space-y-2">
                            {(trainingRoutes || [])
                              .filter(r => r.name.toLowerCase().includes(searchRoute.toLowerCase()))
                              .map(route => (
                                <button
                                    key={route.id}
                                    onClick={() => handleImportRoute(route)}
                                    className="w-full text-left p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="outline" className="text-[8px] h-4 font-black uppercase opacity-60">Route</Badge>
                                        <span className="text-[8px] font-bold text-muted-foreground">{route.legs.length} Waypoints</span>
                                    </div>
                                    <p className="text-xs font-black uppercase">{route.name}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-[8px] bg-red-100/50 text-red-700 hover:bg-red-100/50">{route.hazards.length} Hazards</Badge>
                                        <div className="flex -space-x-1">
                                            {route.legs.slice(0, 3).map((l, i) => (
                                                <div key={i} className="w-4 h-4 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[7px] font-black">{l.waypoint.substring(0, 2)}</div>
                                            ))}
                                            {route.legs.length > 3 && <div className="text-[8px] font-bold text-muted-foreground ml-2">+ {route.legs.length - 3} move</div>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
