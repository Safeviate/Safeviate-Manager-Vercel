'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, NavlogLeg, WaypointContext } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Navigation, Wind, Gauge, Fuel, Settings2, ChevronDown, ChevronRight, PenSquare, Eraser } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { recalculateNavlogLegs, calculateRouteTotals, DEFAULT_FLIGHT_PARAMS } from '@/lib/flight-planner';
import type { FlightParams } from '@/lib/flight-planner';
import type { TrainingRoute } from '@/types/booking';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Library, Search } from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';
import { formatLatLonDms } from '@/lib/coordinate-parser';
import { cn } from '@/lib/utils';

/** Weight of AVGAS per gallon in lbs */
const FUEL_WEIGHT_PER_GALLON = 6;

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
    /** Fuel weight in lbs from the M&B fuel station (for bi-directional sync) */
    fuelWeightLbs?: number;
    /** Callback when endurance changes â€” parent updates the M&B fuel station */
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

function WaypointContextDetails({ context }: { context?: WaypointContext }) {
    if (!context?.items?.length) return null;

    return (
        <div className="mt-1 space-y-1">
            {context.items.map((item, index) => (
                <div key={`${item.layer}-${item.label}-${index}`} className="rounded-md border border-border/70 bg-muted/10 px-2 py-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700">
                        {item.kind ? item.kind.replace(/-/g, ' ') : 'waypoint'}
                    </p>
                    <p className="text-[8px] font-black uppercase leading-tight text-foreground">
                        {item.label}
                    </p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {item.layer}
                    </p>
                    {item.detail ? (
                        <p className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-700">
                            {item.detail}
                        </p>
                    ) : null}
                    {item.frequencies ? (
                        <p className="mt-0.5 text-[8px] font-semibold leading-tight text-emerald-700">
                            {item.frequencies}
                        </p>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

function MetricTile({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
    return (
        <div className="h-[42px] w-[117px] rounded-md border bg-background px-2 py-1.5">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className={`mt-1 text-left font-mono text-[10px] font-black leading-none ${emphasized ? 'text-primary' : 'text-foreground'}`}>{value}</p>
        </div>
    );
}

function WaypointEndpointCard({
    label,
    latitude,
    longitude,
    context,
}: {
    label: string;
    latitude?: number;
    longitude?: number;
    context?: WaypointContext;
}) {
    return (
        <div className="h-[143px] w-[290px] rounded-lg border bg-background px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 shrink font-black uppercase text-foreground text-[10px]">{label}</p>
                <p className="shrink-0 text-right font-mono text-[10px] font-bold text-muted-foreground">
                    {formatLatLonDms(latitude, longitude)}
                </p>
            </div>
            <WaypointContextDetails context={context} />
        </div>
    );
}

function NavlogNotesField({
    value,
    onSave,
    className = '',
}: {
    value?: string;
    onSave: (value: string) => void;
    className?: string;
}) {
    const [draft, setDraft] = useState(value ?? '');

    useEffect(() => {
        setDraft(value ?? '');
    }, [value]);

    return (
        <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
                if ((value ?? '') !== draft) {
                    onSave(draft);
                }
            }}
            placeholder="Add notes for this leg or waypoint"
            className={cn(
                'mt-1 min-h-[92px] resize-none border-border/70 bg-background px-2 py-2 text-[10px] font-semibold leading-tight text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1',
                className
            )}
        />
    );
}

function HandwrittenNotesField({
    textValue,
    inkValue,
    onSaveText,
    onSaveInk,
}: {
    textValue?: string;
    inkValue?: string;
    onSaveText: (value: string) => void;
    onSaveInk: (value?: string) => void;
}) {
    const [draftText, setDraftText] = useState(textValue ?? '');
    const [isPadOpen, setIsPadOpen] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(Boolean(inkValue));
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        setDraftText(textValue ?? '');
    }, [textValue]);

    useEffect(() => {
        setHasDrawing(Boolean(inkValue));
    }, [inkValue]);

    useEffect(() => {
        if (!isPadOpen) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        const width = Math.max(560, Math.floor(parent?.clientWidth ?? 560));
        const height = 320;
        const ratio = window.devicePixelRatio || 1;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(ratio, ratio);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 2;
        context.strokeStyle = '#0f172a';

        if (inkValue) {
            const image = new Image();
            image.onload = () => {
                context.drawImage(image, 0, 0, width, height);
                setHasDrawing(true);
            };
            image.src = inkValue;
        } else {
            setHasDrawing(false);
        }
    }, [inkValue, isPadOpen]);

    const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        drawingRef.current = true;
        const point = getCanvasPoint(event);
        lastPointRef.current = point;
        context.beginPath();
        context.moveTo(point.x, point.y);
        canvas.setPointerCapture(event.pointerId);
    };

    const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        const point = getCanvasPoint(event);
        const lastPoint = lastPointRef.current;
        if (lastPoint) {
            context.beginPath();
            context.moveTo(lastPoint.x, lastPoint.y);
            context.lineTo(point.x, point.y);
            context.stroke();
            setHasDrawing(true);
        }
        lastPointRef.current = point;
    };

    const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        if (event) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const clearPad = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 2;
        context.strokeStyle = '#0f172a';
        setHasDrawing(false);
    };

    const savePad = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        onSaveInk(hasDrawing ? canvas.toDataURL('image/png') : undefined);
        setIsPadOpen(false);
    };

    return (
        <>
            <div className="mt-1 space-y-2">
                <Textarea
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onBlur={() => {
                        if ((textValue ?? '') !== draftText) {
                            onSaveText(draftText);
                        }
                    }}
                    placeholder="Type notes or open the handwriting pad"
                    className="min-h-[72px] resize-none border-border/70 bg-background px-2 py-2 text-[10px] font-semibold leading-tight text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1"
                />
                {inkValue ? (
                    <div className="rounded-md border border-border/70 bg-background p-2">
                        <img src={inkValue} alt="Handwritten notes preview" className="h-20 w-full rounded-sm object-contain" />
                    </div>
                ) : null}
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="h-8 text-[10px] font-black uppercase" onClick={() => setIsPadOpen(true)}>
                        <PenSquare className="mr-2 h-3.5 w-3.5" />
                        Open Pad
                    </Button>
                    {inkValue ? (
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-8 text-[10px] font-black uppercase text-destructive hover:text-destructive"
                            onClick={() => {
                                onSaveInk(undefined);
                                setHasDrawing(false);
                            }}
                        >
                            <Eraser className="mr-2 h-3.5 w-3.5" />
                            Clear Ink
                        </Button>
                    ) : null}
                </div>
            </div>

            <Dialog open={isPadOpen} onOpenChange={setIsPadOpen}>
                <DialogContent className="max-w-3xl bg-background">
                    <DialogHeader>
                        <DialogTitle className="text-xs font-black uppercase tracking-widest">Handwritten Notes Pad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="overflow-hidden rounded-lg border bg-white p-3">
                            <canvas
                                ref={canvasRef}
                                className="block max-w-full touch-none rounded-md bg-white"
                                onPointerDown={startDrawing}
                                onPointerMove={continueDrawing}
                                onPointerUp={stopDrawing}
                                onPointerLeave={stopDrawing}
                                onPointerCancel={stopDrawing}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold text-muted-foreground">
                                Write with your finger, stylus, or mouse. Save inserts the drawing back into the leg summary.
                            </p>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" className="h-8 text-[10px] font-black uppercase" onClick={clearPad}>
                                    Clear Pad
                                </Button>
                                <Button type="button" className="h-8 text-[10px] font-black uppercase" onClick={savePad}>
                                    Save Pad
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
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
    const [expandedLegIds, setExpandedLegIds] = useState<string[]>([]);

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

    // â”€â”€ Bi-directional fuel sync with M&B â”€â”€
    const syncSourceRef = useRef<'navlog' | 'mb' | null>(null);

    // When M&B fuel weight changes â†’ update FOB in gallons
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

    // When FOB changes â†’ push fuel weight to M&B
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

    useEffect(() => {
        const visibleLegIds = calculatedLegs.slice(1).map((leg) => leg.id);
        setExpandedLegIds((current) => {
            const next = current.filter((id) => visibleLegIds.includes(id));
            if (next.length > 0) return next;
            return visibleLegIds[0] ? [visibleLegIds[0]] : [];
        });
    }, [calculatedLegs]);

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
            {/* â”€â”€ Global Flight Parameters Bar â”€â”€ */}
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
                        <span className="text-[9px] font-bold text-muted-foreground">Â° /</span>
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
                        Endurance: <span className="text-foreground">{params.fuelBurnPerHour > 0 ? (params.fuelOnBoard / params.fuelBurnPerHour).toFixed(1) : 'âˆž'} hrs</span>
                    </span>
                    <span className="text-muted-foreground">
                        Reserve: <span className={totals.fuelRemaining < 0 ? 'text-destructive' : 'text-emerald-600'}>{totals.enduranceRemaining.toFixed(1)} hrs ({totals.fuelRemaining.toFixed(1)} {fuelUnit === 'GPH' ? 'GAL' : 'L'})</span>
                    </span>
                </div>
            </div>

            {/* â”€â”€ NavLog Table â”€â”€ */}
            {/* NavLog Leg Cards */}
            <div className="flex-1 overflow-y-auto bg-muted/5 p-4">
                <div className="space-y-4">
                    {calculatedLegs.slice(1).map((leg, index) => {
                        const actualIndex = index + 1;
                        const fromLeg = calculatedLegs[actualIndex - 1];
                        const fuelRem = params.fuelOnBoard - calculatedLegs.slice(1, actualIndex + 1).reduce((s, l) => s + (l.tripFuel || 0), 0);
                        const lowFuel = fuelRem < (params.fuelBurnPerHour * 0.75);
                        const isExpanded = expandedLegIds.includes(leg.id);

                        return (
                            <div key={leg.id} className="overflow-hidden rounded-xl border bg-background shadow-none">
                                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                                    <button
                                        type="button"
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                        onClick={() =>
                                            setExpandedLegIds((current) =>
                                                current.includes(leg.id)
                                                    ? current.filter((id) => id !== leg.id)
                                                    : [...current, leg.id]
                                            )
                                        }
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                            Leg {index + 1}
                                        </span>
                                        <span className="truncate text-sm font-black uppercase text-foreground">
                                            {fromLeg?.waypoint || booking.navlog?.departureIcao || 'Departure'} to {leg.waypoint}
                                        </span>
                                    </button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="no-print h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveLeg(leg.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {isExpanded ? (
                                    <div className="grid gap-4 p-4 lg:grid-cols-[290px_minmax(0,1fr)_242px]">
                                        <section className="w-[290px] space-y-3">
                                            <div className="grid gap-3">
                                                <div className="relative">
                                                    <p className="absolute -top-4 left-0 text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">From</p>
                                                    <WaypointEndpointCard
                                                        label={fromLeg?.waypoint || booking.navlog?.departureIcao || 'Departure'}
                                                        latitude={fromLeg?.latitude ?? booking.navlog?.departureLatitude}
                                                        longitude={fromLeg?.longitude ?? booking.navlog?.departureLongitude}
                                                        context={fromLeg?.waypointContext}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <p className="absolute -top-3 left-0 text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">To</p>
                                                    <WaypointEndpointCard
                                                        label={leg.waypoint}
                                                        latitude={leg.latitude}
                                                        longitude={leg.longitude}
                                                        context={leg.waypointContext}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section className="min-w-0 space-y-3">
                                            <div className="h-[118px] w-full rounded-md border bg-background px-2 py-1.5">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
                                                <NavlogNotesField
                                                    value={leg.notes}
                                                    onSave={(value) => void handleUpdateLeg(leg.id, { notes: value })}
                                                    className="h-[88px] min-h-0"
                                                />
                                            </div>
                                        </section>

                                        <section className="relative w-[242px]">
                                            <p className="absolute -top-4 left-0 text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Leg Calculations</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="h-[42px] w-[117px] rounded-md border bg-background px-2 py-1.5">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Altitude</p>
                                                    <InlineInput
                                                        value={leg.altitude}
                                                        onChange={(v) => handleUpdateLeg(leg.id, { altitude: v })}
                                                        placeholder="FL"
                                                        width="w-full"
                                                        className="mt-1 h-5 border-border/70 bg-background px-2 text-left font-mono text-[10px] font-black leading-none text-foreground"
                                                    />
                                                </div>
                                                {showPerLegWind ? (
                                                    <div className="h-[42px] w-[117px] rounded-md border bg-background px-2 py-1.5">
                                                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Wind</p>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <InlineInput
                                                                value={legs[index]?.windDirection}
                                                                onChange={(v) => handleUpdateLeg(leg.id, { windDirection: v })}
                                                                placeholder={`${params.windDirection}`}
                                                                width="w-[48px]"
                                                                className="h-5 border-border/70 bg-background px-1 text-left font-mono text-[10px] font-black leading-none text-foreground"
                                                            />
                                                            <span className="text-[8px] text-muted-foreground">/</span>
                                                            <InlineInput
                                                                value={legs[index]?.windSpeed}
                                                                onChange={(v) => handleUpdateLeg(leg.id, { windSpeed: v })}
                                                                placeholder={`${params.windSpeed}`}
                                                                width="w-[48px]"
                                                                className="h-5 border-border/70 bg-background px-1 text-left font-mono text-[10px] font-black leading-none text-foreground"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <MetricTile label="Wind" value={`${params.windDirection}/${params.windSpeed} KT`} />
                                                )}
                                                <MetricTile label="True Course" value={`${(leg.trueCourse ?? 0).toFixed(0)}°`} />
                                                <MetricTile label="Wind Correction" value={`${(leg.wca ?? 0) >= 0 ? '+' : ''}${(leg.wca ?? 0).toFixed(0)}°`} />
                                                <MetricTile label="True Heading" value={`${(leg.trueHeading ?? 0).toFixed(0)}°`} />
                                                <MetricTile label="Variation" value={(leg.variation ?? 0) >= 0 ? `${(leg.variation ?? 0).toFixed(0)}°E` : `${Math.abs(leg.variation ?? 0).toFixed(0)}°W`} />
                                                <MetricTile label="Mag Heading" value={`${(leg.magneticHeading ?? 0).toFixed(0)}°`} emphasized />
                                                <MetricTile label="Distance" value={`${(leg.distance ?? 0).toFixed(1)} NM`} />
                                                <MetricTile label="Ground Speed" value={`${(leg.groundSpeed ?? 0).toFixed(0)} KT`} />
                                                <MetricTile label="Est Time Enroute" value={formatMinutes(leg.ete ?? 0)} />
                                                <MetricTile label="Cumulative Time" value={formatMinutes(leg.cumulativeEte ?? 0)} />
                                                <MetricTile label="Fuel Used" value={`${(leg.tripFuel ?? 0).toFixed(1)}`} />
                                                <div className={`h-[42px] w-[117px] rounded-md border px-2 py-1.5 ${lowFuel ? 'border-destructive/30 bg-destructive/5' : 'bg-background'}`}> 
                                                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Fuel Remaining</p>
                                                    <p className={`mt-1 text-left font-mono text-[10px] font-black leading-none ${lowFuel ? 'text-destructive' : 'text-emerald-700'}`}>
                                                        {fuelRem.toFixed(1)}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}

                    {calculatedLegs.length > 1 ? (
                        <div className="rounded-xl border bg-background p-4">
                            <div className="mb-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Leg Notes Summary</p>
                            </div>
                            <div className="space-y-3">
                                {calculatedLegs.slice(1).map((leg, index) => {
                                    const fromLeg = calculatedLegs[index];
                                    const legTitle = `${fromLeg?.waypoint || booking.navlog?.departureIcao || 'Departure'} to ${leg.waypoint}`;

                                    return (
                                        <div key={`${leg.id}-summary`} className="rounded-lg border bg-muted/5 p-3">
                                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                                Leg {index + 1}
                                            </p>
                                            <p className="mt-1 text-[10px] font-black uppercase text-foreground">
                                                {legTitle}
                                            </p>
                                            <NavlogNotesField
                                                value={leg.notes}
                                                onSave={(value) => void handleUpdateLeg(leg.id, { notes: value })}
                                                className="min-h-[96px]"
                                            />
                                            <div className="mt-3 rounded-md border bg-background px-2 py-1.5">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Handwritten Notes</p>
                                                <HandwrittenNotesField
                                                    textValue={leg.handwrittenNotes}
                                                    inkValue={leg.handwrittenNotesInk}
                                                    onSaveText={(value) => void handleUpdateLeg(leg.id, { handwrittenNotes: value })}
                                                    onSaveInk={(value) => void handleUpdateLeg(leg.id, { handwrittenNotesInk: value })}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-xl border bg-background p-4">
                        <div className="mb-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Totals</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                            <MetricTile label="Distance" value={`${totals.distance.toFixed(1)} NM`} />
                            <MetricTile label="Avg GS" value={totals.groundSpeed > 0 ? `${totals.groundSpeed.toFixed(0)} KT` : '-'} />
                            <MetricTile label="ETE" value={formatMinutes(totals.ete)} />
                            <MetricTile label="Fuel" value={totals.fuel.toFixed(1)} />
                            <MetricTile label="Reserve" value={totals.fuelRemaining.toFixed(1)} emphasized={totals.fuelRemaining >= 0} />
                            <MetricTile label="Endurance" value={`${totals.enduranceRemaining.toFixed(1)} hrs`} />
                        </div>
                    </div>
                </div>
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


