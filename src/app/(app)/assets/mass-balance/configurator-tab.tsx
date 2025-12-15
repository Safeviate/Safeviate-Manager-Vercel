

'use client';

import React, { useState, useEffect } from 'react';
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
import { collection, doc } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import {
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Maximize,
  Fuel,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile } from './template-form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';

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

const generateNiceTicks = (
  min: number | string,
  max: number | string,
  stepCount = 6
) => {
  const start = Number(min);
  const end = Number(max);
  if (isNaN(start) || isNaN(end) || start >= end) return [];

  const diff = end - start;
  const roughStep = diff / (stepCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;

  let step;
  if (normalizedStep < 1.5) step = 1 * magnitude;
  else if (normalizedStep < 3) step = 2 * magnitude;
  else if (normalizedStep < 7) step = 5 * magnitude;
  else step = 10 * magnitude;

  const ticks = [];
  let current = Math.ceil(start / step) * step;
  if (current > start) ticks.push(start);

  while (current <= end) {
    ticks.push(current);
    current += step;
  }

  if (
    ticks[ticks.length - 1] < end &&
    end - ticks[ticks.length - 1] < step * 0.1
  ) {
    ticks.push(end);
  }

  return ticks;
};

const OffScreenWarning = ({
  direction,
  value,
  label,
}: {
  direction: string;
  value: number;
  label: string;
}) => (
  <div
    className={`absolute top-1/2 ${
      direction === 'left' ? 'left-4' : 'right-4'
    } transform -translate-y-1/2 bg-destructive/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}
  >
    <AlertTriangle className="text-red-400 mb-1" size={24} />
    <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
    <span className="text-lg font-mono">{value}</span>
    <span className="text-xs text-muted-foreground">
      {direction === 'left' ? <>&larr; Move Left</> : <>Move Right &rarr;</>}
    </span>
  </div>
);

export function ConfiguratorTab() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [modelNameForSave, setModelNameForSave] = useState('');

  const [graphConfig, setGraphConfig] = useState({
    xMin: 80,
    xMax: 94,
    yMin: 1400,
    yMax: 2600,
    envelope: [
      { x: 82, y: 1400 },
      { x: 82, y: 1950 },
      { x: 86.5, y: 2450 },
      { x: 93, y: 2450 },
      { x: 93, y: 1400 },
      { x: 82, y: 1400 },
    ],
  });

  const [basicEmpty, setBasicEmpty] = useState({
    weight: 1416,
    moment: 120360,
    arm: 85.0,
  });

  const [stations, setStations] = useState<any[]>([
    {
      id: 2,
      name: 'Pilot & Front Pax',
      weight: 340,
      arm: 85.5,
      type: 'standard',
    },
    {
      id: 3,
      name: 'Fuel',
      weight: 288,
      arm: 95.0,
      type: 'fuel',
      gallons: 48,
      maxGallons: 50,
    },
    { id: 4, name: 'Rear Pax', weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: 'Baggage', weight: 0, arm: 142.8, type: 'standard' },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  // --- Fetch Templates ---
  const profilesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', 'safeviate', 'aircraftModelProfiles') : null),
    [firestore]
  );
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);


  useEffect(() => {
    let totalMom = parseFloat(basicEmpty.moment as any) || 0;
    let totalWt = parseFloat(basicEmpty.weight as any) || 0;

    stations.forEach((st) => {
      const wt = parseFloat(st.weight) || 0;
      const arm = parseFloat(st.arm) || 0;
      totalWt += wt;
      totalMom += wt * arm;
    });

    const cg = totalWt > 0 ? totalMom / totalWt : 0;
    const safe =
      graphConfig.envelope.length > 2
        ? isPointInPolygon({ x: cg, y: totalWt }, graphConfig.envelope)
        : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe,
    });
  }, [stations, basicEmpty, graphConfig.envelope]);

  const handleBasicEmptyChange = (field: string, value: string) => {
    const val = parseFloat(value) || 0;
    if (field === 'weight') {
      const newMoment = val * basicEmpty.arm;
      setBasicEmpty({
        ...basicEmpty,
        weight: val,
        moment: parseFloat(newMoment.toFixed(2)),
      });
    } else if (field === 'moment') {
      const newArm = basicEmpty.weight > 0 ? val / basicEmpty.weight : 0;
      setBasicEmpty({
        ...basicEmpty,
        moment: val,
        arm: parseFloat(newArm.toFixed(2)),
      });
    } else if (field === 'arm') {
      const newMoment = basicEmpty.weight * val;
      setBasicEmpty({
        ...basicEmpty,
        arm: val,
        moment: parseFloat(newMoment.toFixed(2)),
      });
    }
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
        return { ...s, [field]: val };
      })
    );
  };

  const handleAutoFit = () => {
    if (graphConfig.envelope.length < 2)
      return toast({ variant: 'destructive', title: 'Add points first!' });
    const xValues = graphConfig.envelope.map((p) => p.x);
    const minX = Math.floor(Math.min(...xValues) - 1);
    const maxX = Math.ceil(Math.max(...xValues) + 1);
    setGraphConfig((prevConfig) => ({ ...prevConfig, xMin: minX, xMax: maxX }));
  };

  const updateStation = (id: number, field: string, val: any) =>
    setStations(stations.map((s) => (s.id === id ? { ...s, [field]: val } : s)));

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

  const removeStation = (id: number) =>
    setStations(stations.filter((s) => s.id !== id));

  const updateEnvelopePoint = (index: number, field: string, val: string) => {
    const newEnv = [...graphConfig.envelope];
    (newEnv[index] as any)[field] = Number(val);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };
  const addEnvelopePoint = () =>
    setGraphConfig({
      ...graphConfig,
      envelope: [...graphConfig.envelope, { x: 0, y: 0 }],
    });
  const removeEnvelopePoint = (index: number) => {
    const newEnv = graphConfig.envelope.filter((_, i) => i !== index);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };

  const handleReset = () => {
    if (window.confirm('Reset to default Piper PA-28 data?')) {
      setGraphConfig({
        xMin: 80,
        xMax: 94,
        yMin: 1400,
        yMax: 2600,
        envelope: [
          { x: 82, y: 1400 },
          { x: 82, y: 1950 },
          { x: 86.5, y: 2450 },
          { x: 93, y: 2450 },
          { x: 93, y: 1400 },
          { x: 82, y: 1400 },
        ],
      });
      setBasicEmpty({ weight: 1416, moment: 120360, arm: 85.0 });
      setStations([
        {
          id: 2,
          name: 'Pilot & Front Pax',
          weight: 340,
          arm: 85.5,
          type: 'standard',
        },
        {
          id: 3,
          name: 'Fuel',
          weight: 288,
          arm: 95.0,
          type: 'fuel',
          gallons: 48,
          maxGallons: 50,
        },
      ]);
      setModelNameForSave('Piper PA-28-180');
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = profiles?.find(p => p.id === templateId);
    if (!template) return;

    setModelNameForSave(`${template.make} ${template.model}`);
    
    // Separate BEW from other stations
    const bewStation = template.stations?.find(s => s.name === 'Basic Empty Weight');
    const otherStations = template.stations?.filter(s => s.name !== 'Basic Empty Weight') || [];

    setBasicEmpty({
        weight: bewStation?.weight || template.emptyWeight || 0,
        moment: (bewStation?.weight || template.emptyWeight || 0) * (bewStation?.arm || 0) || template.emptyWeightMoment || 0,
        arm: bewStation?.arm || 0,
    });
    setStations(otherStations);

    setGraphConfig({
        xMin: template.xMin || 0,
        xMax: template.xMax || 100,
        yMin: template.yMin || 0,
        yMax: template.yMax || 3000,
        envelope: template.cgEnvelope || [],
    });

    toast({
        title: "Template Loaded",
        description: `Loaded the W&B profile for ${template.make} ${template.model}.`,
    });
  };

  const saveConfiguration = () => {
    if (!modelNameForSave) {
      toast({ variant: 'destructive', title: 'Model Name Required' });
      return;
    }
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Database not available' });
      return;
    }

    const configData = {
      modelName: modelNameForSave,
      basicEmpty,
      stations,
      graphConfig,
      savedAt: new Date().toISOString()
    };
    
    // Save to the new, separate path as instructed
    const collectionRef = collection(firestore, 'tenants', tenantId, 'assets', 'massAndBalance');
    addDocumentNonBlocking(collectionRef, configData);

    toast({
      title: 'Configuration Saved',
      description: `The configuration for "${modelNameForSave}" has been saved.`,
    });

    setIsSaveDialogOpen(false);
  };

  const allX = [
    ...graphConfig.envelope.map((p) => p.x),
    results.cg,
  ].filter((n) => !isNaN(n));
  const allY = [
    ...graphConfig.envelope.map((p) => p.y),
    results.weight,
  ].filter((n) => !isNaN(n));
  const paddingX = 0.5;
  const paddingY = 50;
  const finalXMin = Math.min(Number(graphConfig.xMin), Math.min(...allX) - paddingX);
  const finalXMax = Math.max(Number(graphConfig.xMax), Math.max(...allX) + paddingX);
  const finalYMin = Math.min(Number(graphConfig.yMin), Math.min(...allY) - paddingY);
  const finalYMax = Math.max(Number(graphConfig.yMax), Math.max(...allY) + paddingY);
  const xAxisTicks = generateNiceTicks(finalXMin, finalXMax, 8);
  const yAxisTicks = generateNiceTicks(finalYMin, finalYMax, 8);
  const isOffScreen = () => { if (results.cg < finalXMin) return { axis: 'x', dir: 'left', val: results.cg }; return null; };
  const offScreenStatus = isOffScreen();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          W&amp;B Configurator
        </h1>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="destructive">
            <RotateCcw size={16} className="mr-2" /> Reset
          </Button>
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
             <DialogTrigger asChild>
                <Button>
                    <Save size={16} className="mr-2" /> Save Configuration
                </Button>
             </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save W&B Configuration</DialogTitle>
                    <DialogDescription>
                        Enter a name for this aircraft model configuration.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="model-name">Model Name</Label>
                    <Input 
                        id="model-name"
                        value={modelNameForSave}
                        onChange={(e) => setModelNameForSave(e.target.value)}
                        placeholder="e.g., Cessna 172S"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={saveConfiguration} disabled={!modelNameForSave.trim()}>Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Interactive Graph</CardTitle>
            <CardDescription>Visualize the aircraft&apos;s center of gravity based on the configuration below.</CardDescription>
        </CardHeader>
        <CardContent className="relative min-h-[500px] flex flex-col justify-center items-center overflow-hidden pt-6">
          {offScreenStatus && (
            <OffScreenWarning
              direction={offScreenStatus.dir}
              value={offScreenStatus.val}
              label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'}
            />
          )}
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
                domain={[finalXMin, finalXMax]}
                ticks={xAxisTicks}
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
                domain={[finalYMin, finalYMax]}
                ticks={yAxisTicks}
                allowDataOverflow={true}
              >
                <RechartsLabel
                  value="Gross Weight (lbs)"
                  angle={-90}
                  position="insideLeft"
                />
              </YAxis>
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                name="Envelope Line"
                data={graphConfig.envelope}
                fill="transparent"
                line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                shape={() => null}
                isAnimationActive={false}
              />
              <Scatter
                name="Envelope Points"
                data={graphConfig.envelope}
                isAnimationActive={false}
              >
                {graphConfig.envelope.map((entry, index) => (
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
          <p className="font-extrabold text-red-600 absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap drop-shadow-md uppercase tracking-widest text-sm md:text-base">
            CONSULT AIRCRAFT POH BEFORE FLIGHT
          </p>
          <div
            className={cn(
              'absolute bottom-4 right-4 px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-2',
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
        </CardContent>
        <CardContent className="p-6">
        <div className='space-y-4'>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="model-name">Template Name</Label>
                    <Input
                        id="model-name"
                        value={modelNameForSave}
                        onChange={(e) => setModelNameForSave(e.target.value)}
                        placeholder="e.g., Piper PA 28 180"
                    />
                </div>
                 <div>
                    <Label>Load Saved Template</Label>
                    <Select onValueChange={handleLoadTemplate} disabled={isLoadingProfiles}>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingProfiles ? "Loading templates..." : "Select a template"} />
                        </SelectTrigger>
                        <SelectContent>
                            {(profiles || []).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.make} {p.model}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
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
                            <Button onClick={() => addStation('standard')} variant="outline" size="sm" type='button'>
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
                                <Input value="Basic Empty Weight" readOnly disabled className="col-span-5 h-8" />
                                <Input
                                type="number"
                                value={basicEmpty.weight}
                                onChange={(e) => handleBasicEmptyChange('weight', e.target.value)}
                                className="text-right h-8 col-span-3"
                                />
                                <Input
                                type="number"
                                value={basicEmpty.arm}
                                onChange={(e) => handleBasicEmptyChange('arm', e.target.value)}
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
                                                onChange={(e) => updateStation(s.id, 'name', e.target.value)}
                                                className="text-sm font-bold h-8 flex-grow"
                                            />
                                            </div>
                                            <div className="col-span-3">
                                            <Input
                                                type="number"
                                                value={s.weight}
                                                onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)}
                                                className="text-sm text-right h-8"
                                            />
                                            </div>
                                            <div className="col-span-3">
                                            <Input
                                                type="number"
                                                value={s.arm}
                                                onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)}
                                                className="text-sm text-right h-8"
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
                                                <Input value="Gallons" readOnly disabled className="text-xs text-muted-foreground h-8 col-span-2"/>
                                            </div>
                                            <div className="col-span-3">
                                                <Input
                                                    id={`gallons-${s.id}`}
                                                    type="number"
                                                    value={s.gallons || 0}
                                                    onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                                    className="h-8 text-right"
                                                />
                                            </div>
                                            <div className="col-span-3 flex items-center gap-1">
                                                <Label htmlFor={`max-gallons-${s.id}`} className='text-xs text-muted-foreground flex-shrink-0'>Max:</Label>
                                                <Input
                                                    id={`max-gallons-${s.id}`}
                                                    type="number"
                                                    value={s.maxGallons || 0}
                                                    onChange={(e) => updateStation(s.id, 'maxGallons', e.target.value)}
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
                                        onChange={(e) => updateStation(s.id, 'name', e.target.value)}
                                        placeholder="Item Name"
                                        className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                        type="number"
                                        value={s.weight}
                                        onChange={(e) => updateStation(s.id, 'weight', e.target.value)}
                                        className="text-right h-8"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                        type="number"
                                        value={s.arm}
                                        onChange={(e) => updateStation(s.id, 'arm', e.target.value)}
                                        className="text-right h-8"
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium mb-2">Chart Axis Limits</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                      <Label>Min CG</Label>
                      <Input
                        type="number"
                        value={graphConfig.xMin}
                        onChange={(e) => setGraphConfig({ ...graphConfig, xMin: e.target.value as any })}
                      />
                    </div>
                    <div>
                      <Label>Max CG</Label>
                      <Input
                        type="number"
                        value={graphConfig.xMax}
                        onChange={(e) => setGraphConfig({ ...graphConfig, xMax: e.target.value as any })}
                      />
                    </div>
                    <div>
                      <Label>Min Weight</Label>
                      <Input
                        type="number"
                        value={graphConfig.yMin}
                        onChange={(e) => setGraphConfig({ ...graphConfig, yMin: e.target.value as any })}
                      />
                    </div>
                    <div>
                      <Label>Max Weight</Label>
                      <Input
                        type="number"
                        value={graphConfig.yMax}
                        onChange={(e) => setGraphConfig({ ...graphConfig, yMax: e.target.value as any })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAutoFit} variant="outline" size="sm" type="button" className='w-full'>
                    <Maximize size={16} className="mr-2" /> Auto-Fit Axes
                  </Button>
                </div>
                
                <Separator />
                
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-medium">CG Envelope Points</h3>
                        <Button type="button" size="sm" variant="outline" onClick={addEnvelopePoint}>
                            <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-1 mb-2">
                        <div className="col-span-1"></div>
                        <div className="col-span-5 text-right">CG (X)</div>
                        <div className="col-span-5 text-right">Weight (Y)</div>
                    </div>
                  <div className="space-y-2 mt-2">
                    {graphConfig.envelope.map((pt, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 col-span-1"
                          style={{
                            backgroundColor:
                              POINT_COLORS[i % POINT_COLORS.length],
                          }}
                        >
                          {i + 1}
                        </div>
                        <Input
                          type="number"
                          value={pt.x}
                          onChange={(e) =>
                            updateEnvelopePoint(i, 'x', e.target.value)
                          }
                          placeholder="CG (X)"
                          className='col-span-5 text-right'
                        />
                        <Input
                          type="number"
                          value={pt.y}
                          onChange={(e) =>
                            updateEnvelopePoint(i, 'y', e.target.value)
                          }
                          placeholder="Weight (Y)"
                          className='col-span-5 text-right'
                        />
                        <Button
                          onClick={() => removeEnvelopePoint(i)}
                          variant="ghost"
                          size="icon"
                          type="button"
                          className='h-8 w-8 text-muted-foreground hover:text-destructive col-span-1'
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfiguratorTab;
