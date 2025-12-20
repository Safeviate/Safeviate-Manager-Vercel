'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, query, where, getDocs, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import {
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Maximize,
  Fuel,
  AlertTriangle,
  Plane,
  XCircle,
  Wrench,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile } from '@/types/aircraft-wb-profile';
import type { Aircraft } from '../page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
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
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

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
  const searchParams = useSearchParams();
  const aircraftIdFromUrl = searchParams.get('aircraftId');
  
  // Hardcoded permissions for now - will be replaced with real auth logic
  const canManageTemplates = true; 

  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSaveProfileDialogOpen, setIsSaveProfileDialogOpen] = useState(false);
  const [isClearAircraftDialogOpen, setIsClearAircraftDialogOpen] = useState(false);
  const [isConfirmClearDialogOpen, setIsConfirmClearDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileNameForSave, setProfileNameForSave] = useState('');
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [loadedAircraftTailNumber, setLoadedAircraftTailNumber] = useState<string | null>(null);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);


  const form = useForm();

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

  // --- Fetch Data ---
  const profilesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'massAndBalance') : null),
    [firestore]
  );
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
  
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null),
    [firestore]
  );
  const { data: aircraftList, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);


  // --- Logic for Read-Only Mode & Loading ---
  useEffect(() => {
    setIsReadOnly(!canManageTemplates);
    if (aircraftIdFromUrl && aircraftList) {
        handleLoadFromAircraft(aircraftIdFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftIdFromUrl, aircraftList, canManageTemplates]);

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

  const loadProfileData = (template: AircraftModelProfile) => {
    setProfileNameForSave(template.profileName || '');
    setLoadedAircraftTailNumber(null);
    
    const bewStation = template.stations?.find(s => s.type === 'bew');
    const otherStations = template.stations?.filter(s => s.type !== 'bew') || [];

    setBasicEmpty({
        weight: bewStation?.weight || template.emptyWeight || 0,
        moment: (bewStation?.weight || 0) * (bewStation?.arm || 0) || template.emptyWeightMoment || 0,
        arm: bewStation?.arm || ((template.emptyWeight || 0) > 0 ? (template.emptyWeightMoment || 0) / template.emptyWeight! : 0),
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
        title: "Profile Loaded",
        description: `Loaded the Mass & Balance profile for ${template.profileName}.`,
    });
  }

  const handleReset = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Firestore not available' });
      return;
    }
    
    // This is a hardcoded representation of the default state
    const defaultProfileData = {
        profileName: "Default",
        stations: [
            { id: 2, name: 'Pilot & Front Pax', weight: 340, arm: 85.5, type: 'standard' },
            { id: 3, name: 'Fuel', weight: 288, arm: 95, type: 'fuel', gallons: 48, maxGallons: 50 },
            { id: 4, name: 'Rear Pax', weight: 0, arm: 118.1, type: 'standard' },
            { id: 5, name: 'Baggage', weight: 0, arm: 142.8, type: 'standard' },
        ],
        cgEnvelope: [
            { x: 82, y: 1400 },
            { x: 82, y: 1950 },
            { x: 86.5, y: 2450 },
            { x: 93, y: 2450 },
            { x: 93, y: 1400 },
            { x: 82, y: 1400 },
        ],
        xMin: 80, xMax: 94, yMin: 1400, yMax: 2600,
        emptyWeight: 1416, emptyWeightMoment: 120360,
    };
    
    setLoadedAircraftTailNumber(null);
    setSelectedAircraftId('');
    setSelectedTemplateId('');
    setLoadedProfileId(null);
    loadProfileData(defaultProfileData as AircraftModelProfile);
    toast({ title: "Configurator Reset", description: "The configurator has been reset to the default Cessna 172S values."});
  };

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return;

    const template = profiles?.find(p => p.id === templateId);
    if (!template) {
        toast({ variant: 'destructive', title: 'Profile Not Found', description: 'Could not find the selected profile.' });
        return;
    }
    
    setSelectedTemplateId(templateId); 
    setLoadedProfileId(template.id);
    loadProfileData(template);
    setLoadedAircraftTailNumber(null);
    setSelectedAircraftId('');
  };

  const handleLoadFromAircraft = (aircraftId: string) => {
    const aircraft = aircraftList?.find(a => a.id === aircraftId);
    if (!aircraft) return;

    setSelectedAircraftId(aircraftId);
    setLoadedAircraftTailNumber(aircraft.tailNumber);
    setLoadedProfileId(null);

    setProfileNameForSave(aircraft.tailNumber || '');

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
        if(aircraft.stationArms.fuel) reconstructedStations.push({ id: Date.now() + 5, name: 'Fuel', arm: aircraft.stationArms.fuel, weight: 0, type: 'fuel', gallons: 0, maxGallons: 50 }); // Assume max 50 gal
    }
    setStations(reconstructedStations);

    const envelope = (aircraft.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight })); // Convert [{weight, cg}] to [{x,y}]
    setGraphConfig({
        xMin: Math.min(...envelope.map(p => p.x)) - 2 || 0,
        xMax: Math.max(...envelope.map(p => p.x)) + 2 || 100,
        yMin: Math.min(...envelope.map(p => p.y)) - 200 || 0,
        yMax: Math.max(...envelope.map(p => p.y)) + 200 || 3000,
        envelope,
    });
    
    toast({
        title: "Aircraft M&B Loaded",
        description: `Loaded configuration for ${aircraft.tailNumber}.`,
    });
    
    setSelectedTemplateId('');
  };

  const saveAsProfile = async () => {
    if (!profileNameForSave) {
        toast({ variant: 'destructive', title: 'Profile Name Required' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Database not available' });
        return;
    }
    
    const configData: Partial<AircraftModelProfile> = {
        profileName: profileNameForSave,
        emptyWeight: basicEmpty.weight,
        emptyWeightMoment: basicEmpty.moment,
        stations: [
            { id: 1, name: 'Basic Empty Weight', weight: basicEmpty.weight, arm: basicEmpty.arm, type: 'bew' },
            ...stations,
        ],
        cgEnvelope: graphConfig.envelope,
        xMin: graphConfig.xMin,
        xMax: graphConfig.xMax,
        yMin: graphConfig.yMin,
        yMax: graphConfig.yMax,
    };
    
    try {
        const collectionRef = collection(firestore, 'tenants', tenantId, 'massAndBalance');
        const docRef = await addDoc(collectionRef, configData);
        
        toast({
            title: 'Profile Saved',
            description: `The profile "${profileNameForSave}" has been saved.`,
        });
        
        // After saving, load the newly created profile
        setSelectedTemplateId(docRef.id);
        setLoadedProfileId(docRef.id);

        setIsSaveProfileDialogOpen(false);
        setProfileNameForSave('');
    } catch (error) {
        console.error("Error saving profile: ", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the profile to the database. Check console for details.'
        });
    }
  };

  const handleUpdateProfile = () => {
    if (!loadedProfileId) {
        toast({ variant: 'destructive', title: 'No Profile Loaded' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Database not available' });
        return;
    }

    const loadedProfile = profiles?.find(p => p.id === loadedProfileId);
    if (!loadedProfile) {
        toast({ variant: 'destructive', title: 'Loaded profile not found' });
        return;
    }

    const configData: Partial<AircraftModelProfile> = {
        profileName: loadedProfile.profileName,
        emptyWeight: basicEmpty.weight,
        emptyWeightMoment: basicEmpty.moment,
        stations: [
            { id: 1, name: 'Basic Empty Weight', weight: basicEmpty.weight, arm: basicEmpty.arm, type: 'bew' },
            ...stations,
        ],
        cgEnvelope: graphConfig.envelope,
        xMin: graphConfig.xMin,
        xMax: graphConfig.xMax,
        yMin: graphConfig.yMin,
        yMax: graphConfig.yMax,
    };

    const docRef = doc(firestore, 'tenants', tenantId, 'massAndBalance', loadedProfileId);
    updateDocumentNonBlocking(docRef, configData);

    toast({
        title: 'Profile Updated',
        description: `The profile "${loadedProfile.profileName}" has been updated.`,
    });
  };

  const handleDeleteProfile = async () => {
    if (!loadedProfileId) {
        toast({ variant: 'destructive', title: 'No Profile Loaded', description: 'Please load a profile to delete it.' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Database not available' });
        return;
    }

    const docRef = doc(firestore, 'tenants', tenantId, 'massAndBalance', loadedProfileId);
    await deleteDoc(docRef);

    toast({
        title: 'Profile Deleted',
        description: `The profile has been successfully deleted.`,
    });
    
    await handleReset();
    setIsDeleteDialogOpen(false);
  };

  const handleAssignToAircraft = () => {
    if (!selectedAircraftId) {
        toast({ variant: 'destructive', title: 'No Aircraft Selected' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Database not available' });
        return;
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', selectedAircraftId);
    
    const stationArms: Record<string, number> = {};
    stations.forEach(s => {
        if (s.name.toLowerCase().includes('front')) stationArms.frontSeats = s.arm;
        if (s.name.toLowerCase().includes('rear')) stationArms.rearSeats = s.arm;
        if (s.name.toLowerCase().includes('baggage 1')) stationArms.baggage1 = s.arm;
        if (s.name.toLowerCase().includes('baggage 2')) stationArms.baggage2 = s.arm;
        if (s.type === 'fuel') stationArms.fuel = s.arm;
    });

    const dataToUpdate = {
        emptyWeight: basicEmpty.weight,
        emptyWeightMoment: basicEmpty.moment,
        maxTakeoffWeight: Math.max(...graphConfig.envelope.map(p => p.y)),
        cgEnvelope: graphConfig.envelope.map(p => ({ weight: p.y, cg: p.x })),
        stationArms,
    };

    updateDocumentNonBlocking(aircraftRef, dataToUpdate);

    toast({
        title: 'Configuration Assigned',
        description: `The current M&B configuration has been saved to the selected aircraft.`
    });
  }

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleClearAircraftWandB = () => {
    if (!selectedAircraftId) {
        toast({ variant: 'destructive', title: 'No Aircraft Selected' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Database not available' });
        return;
    }

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', selectedAircraftId);

    const dataToClear = {
        emptyWeight: null,
        emptyWeightMoment: null,
        maxTakeoffWeight: null,
        maxLandingWeight: null,
        cgEnvelope: [],
        stationArms: {},
    };

    updateDocumentNonBlocking(aircraftRef, dataToClear);

    toast({
        title: 'Aircraft M&B Cleared',
        description: `The Mass & Balance configuration has been cleared for the selected aircraft.`
    });
    
    handleClearDialogOpenChange(false);
  }

  const handleClearDialogOpenChange = (open: boolean) => {
    setIsClearAircraftDialogOpen(open);
    if (!open) {
      // Reset subordinate states when main dialog closes
      setShowConfirmClear(false);
      setSelectedAircraftId('');
    }
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

  const loadedProfileName = loadedProfileId ? profiles?.find(p => p.id === loadedProfileId)?.profileName : null;
  const selectedAircraftName = selectedAircraftId ? aircraftList?.find(a => a.id === selectedAircraftId)?.tailNumber : '';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className='flex items-center gap-4'>
            <h1 className="text-2xl font-bold tracking-tight">
            Mass &amp; Balance Configurator
            </h1>
        </div>
        <div className="flex gap-3">
          {!isReadOnly && (
             <Button onClick={handleReset} variant="outline">
                <RotateCcw size={16} className="mr-2" /> Reset
            </Button>
          )}

           {canManageTemplates && (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Plane size={16} className="mr-2" /> Assign to Aircraft
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Configuration to Aircraft</DialogTitle>
                        <DialogDescription>
                            This will overwrite the selected aircraft&apos;s current M&amp;B data with the data from the configurator.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="aircraft-select">Aircraft Registration</Label>
                        <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId}>
                            <SelectTrigger id="aircraft-select">
                                <SelectValue placeholder="Select an aircraft..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(aircraftList || []).map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAssignToAircraft} disabled={!selectedAircraftId}>Confirm Assignment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
           )}

            {canManageTemplates && (
                 <Dialog open={isClearAircraftDialogOpen} onOpenChange={handleClearDialogOpenChange}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Wrench size={16} className="mr-2" /> Clear Aircraft M&amp;B
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        {!showConfirmClear ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Clear Aircraft Mass & Balance</DialogTitle>
                                    <DialogDescription>
                                        Select an aircraft to clear its stored M&amp;B configuration. This action cannot be undone.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-2">
                                    <Label htmlFor="aircraft-clear-select">Aircraft Registration</Label>
                                    <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId}>
                                        <SelectTrigger id="aircraft-clear-select">
                                            <SelectValue placeholder="Select an aircraft..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(aircraftList || []).map(a => (
                                                <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => handleClearDialogOpenChange(false)}>Cancel</Button>
                                    <Button variant='destructive' disabled={!selectedAircraftId} onClick={() => setShowConfirmClear(true)}>
                                        Proceed to Clear
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                                    <DialogDescription>
                                        This will permanently delete the mass and balance data for aircraft <span className='font-bold'>{selectedAircraftName}</span>.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowConfirmClear(false)}>Go Back</Button>
                                    <Button onClick={handleClearAircraftWandB} variant="destructive">
                                        Yes, Clear Data
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            )}

            {canManageTemplates && (
                <>
                    {loadedProfileId ? (
                        <div className='flex gap-2'>
                            <Button onClick={handleUpdateProfile}>
                                <Save size={16} className="mr-2" /> Update Profile
                            </Button>
                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 size={16} className="mr-2" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the profile for &quot;{loadedProfileName}&quot;.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteProfile} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ) : (
                    <Dialog open={isSaveProfileDialogOpen} onOpenChange={setIsSaveProfileDialogOpen}>
                        <DialogTrigger asChild>
                        <Button>
                            <Save size={16} className="mr-2" /> Save as New Profile
                        </Button>
                        </DialogTrigger>
                        <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save as New Profile</DialogTitle>
                            <DialogDescription>
                            Enter a name for this configuration to create a new reusable template.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="profile-name">Profile Name</Label>
                            <Input
                                id="profile-name"
                                value={profileNameForSave}
                                onChange={(e) => setProfileNameForSave(e.target.value)}
                                placeholder="e.g., Cessna 172S Standard"
                            />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={saveAsProfile} disabled={!profileNameForSave.trim()}>Save Profile</Button>
                        </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  )}
                </>
            )}
        </div>
      </div>
      <Card className="relative">
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
          <div className="flex items-center gap-4">
            <CardTitle>Interactive Graph</CardTitle>
            {(loadedAircraftTailNumber || loadedProfileName) && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {loadedAircraftTailNumber ? `Aircraft: ${loadedAircraftTailNumber}` : `Profile: ${loadedProfileName}`}
                </span>
              </p>
            )}
          </div>
          <CardDescription>
            Visualize the aircraft&apos;s center of gravity based on the
            configuration below.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[500px] flex flex-col justify-center items-center overflow-hidden pt-6">
            {isReadOnly && (
                <Alert className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-auto bg-background/80 backdrop-blur-sm">
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                       {'You do not have permission to perform this action.'}
                    </AlertDescription>
                </Alert>
            )}
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
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button>Save to Booking</Button>
          </CardFooter>
      </Card>
      <Card>
        <CardContent className="p-6">
            <p className="font-extrabold text-red-600 text-center pointer-events-none whitespace-nowrap drop-shadow-md uppercase tracking-widest text-sm md:text-base">
                CONSULT AIRCRAFT POH BEFORE FLIGHT
            </p>

            
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Load Saved Profile</Label>
                    <Select
                    onValueChange={handleLoadTemplate}
                    value={selectedTemplateId}
                    disabled={isLoadingProfiles || isReadOnly}
                    >
                    <SelectTrigger>
                        <SelectValue
                        placeholder={
                            isLoadingProfiles
                            ? 'Loading profiles...'
                            : 'Select a profile'
                        }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {(profiles || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.profileName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Load from Aircraft Registration</Label>
                    <Select
                    onValueChange={handleLoadFromAircraft}
                    value={selectedAircraftId}
                    disabled={isLoadingAircraft || isReadOnly}
                    >
                    <SelectTrigger>
                        <SelectValue
                        placeholder={
                            isLoadingAircraft
                            ? 'Loading aircraft...'
                            : 'Select an aircraft'
                        }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {(aircraftList || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                            {a.tailNumber}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                </div>
                

            <Separator className='my-6' />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium">Loading Stations</h3>
                    {!isReadOnly && (
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
                    )}
                  </div>
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground px-1 mb-2">
                    <div className="col-span-4">Station Name</div>
                    <div className="col-span-2 text-right">Weight</div>
                    <div className="col-span-2 text-right">Arm</div>
                    <div className="col-span-3 text-right">Moment</div>
                  </div>
                  <div className="space-y-2">
                    {/* Basic Empty Weight */}
                    <div className="grid grid-cols-12 gap-2 items-center text-sm">
                      <Input
                        value="Basic Empty Weight"
                        readOnly
                        disabled
                        className="col-span-4 h-8"
                      />
                      <Input
                        type="number"
                        value={basicEmpty.weight}
                        onChange={(e) =>
                          handleBasicEmptyChange('weight', e.target.value)
                        }
                        className="text-right h-8 col-span-2"
                        readOnly={isReadOnly}
                      />
                      <Input
                        type="number"
                        value={basicEmpty.arm}
                        onChange={(e) =>
                          handleBasicEmptyChange('arm', e.target.value)
                        }
                        className="text-right h-8 col-span-2"
                        readOnly={isReadOnly}
                      />
                      <Input
                        type="number"
                        value={basicEmpty.moment}
                        onChange={(e) =>
                          handleBasicEmptyChange('moment', e.target.value)
                        }
                        className="text-right h-8 col-span-3"
                        readOnly={isReadOnly}
                      />
                    </div>
                    {/* Dynamic Stations */}
                    {stations.map((s) => (
                      <div key={s.id} className="group relative">
                        {s.type === 'fuel' ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4 flex items-center gap-2">
                                <Input
                                  value={s.name}
                                  onChange={(e) =>
                                    updateStation(s.id, 'name', e.target.value)
                                  }
                                  className="text-sm font-bold h-8 flex-grow"
                                  readOnly={isReadOnly}
                                />
                              </div>
                              <div className="col-span-2">
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
                                  readOnly={isReadOnly}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  value={s.arm}
                                  onChange={(e) =>
                                    handleFuelChange(s.id, 'arm', e.target.value)
                                  }
                                  className="text-sm text-right h-8"
                                  readOnly={isReadOnly}
                                />
                              </div>
                              <div className="col-span-3">
                                  <Input
                                    type="number"
                                    value={s.weight * s.arm}
                                    readOnly
                                    disabled
                                    className="text-sm text-right h-8"
                                  />
                              </div>
                              <div className="col-span-1 flex justify-end">
                                {!isReadOnly && (
                                    <Button
                                    onClick={() => removeStation(s.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                                    type="button"
                                    >
                                    <Trash2 size={16} />
                                    </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <Input
                                  value="Gallons"
                                  readOnly
                                  disabled
                                  className="text-xs text-muted-foreground h-8 col-span-2"
                                />
                              </div>
                              <div className="col-span-2">
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
                                  readOnly={isReadOnly}
                                />
                              </div>
                              <div className="col-span-2 flex items-center gap-1">
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
                                  readOnly={isReadOnly}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <Input
                                value={s.name}
                                onChange={(e) =>
                                  updateStation(s.id, 'name', e.target.value)
                                }
                                placeholder="Item Name"
                                className="h-8"
                                readOnly={isReadOnly}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={s.weight}
                                onChange={(e) =>
                                  updateStation(s.id, 'weight', e.target.value)
                                }
                                className="text-right h-8"
                                readOnly={isReadOnly}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={s.arm}
                                onChange={(e) =>
                                  updateStation(s.id, 'arm', e.target.value)
                                }
                                className="text-right h-8"
                                readOnly={isReadOnly}
                              />
                            </div>
                             <div className="col-span-3">
                                <Input
                                type="number"
                                value={s.weight * s.arm}
                                readOnly
                                disabled
                                className="text-sm text-right h-8"
                                />
                             </div>
                            <div className="col-span-1 flex justify-end">
                                {!isReadOnly && (
                                    <Button
                                        onClick={() => removeStation(s.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                                        type="button"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
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
                  <h3 className="text-md font-medium mb-2">
                    Chart Axis Limits
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                      <Label>Min CG</Label>
                      <Input
                        type="number"
                        value={graphConfig.xMin}
                        onChange={(e) =>
                          setGraphConfig({
                            ...graphConfig,
                            xMin: e.target.value as any,
                          })
                        }
                        readOnly={isReadOnly}
                      />
                    </div>
                    <div>
                      <Label>Max CG</Label>
                      <Input
                        type="number"
                        value={graphConfig.xMax}
                        onChange={(e) =>
                          setGraphConfig({
                            ...graphConfig,
                            xMax: e.target.value as any,
                          })
                        }
                        readOnly={isReadOnly}
                      />
                    </div>
                    <div>
                      <Label>Min Weight</Label>
                      <Input
                        type="number"
                        value={graphConfig.yMin}
                        onChange={(e) =>
                          setGraphConfig({
                            ...graphConfig,
                            yMin: e.target.value as any,
                          })
                        }
                        readOnly={isReadOnly}
                      />
                    </div>
                    <div>
                      <Label>Max Weight</Label>
                      <Input
                        type="number"
                        value={graphConfig.yMax}
                        onChange={(e) =>
                          setGraphConfig({
                            ...graphConfig,
                            yMax: e.target.value as any,
                          })
                        }
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button
                        onClick={handleAutoFit}
                        variant="outline"
                        size="sm"
                        type="button"
                        className="w-full"
                    >
                        <Maximize size={16} className="mr-2" /> Auto-Fit Axes
                    </Button>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium">CG Envelope Points</h3>
                    {!isReadOnly && (
                        <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addEnvelopePoint}
                        >
                        <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                    )}
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
                          className="col-span-5 text-right"
                          readOnly={isReadOnly}
                        />
                        <Input
                          type="number"
                          value={pt.y}
                          onChange={(e) =>
                            updateEnvelopePoint(i, 'y', e.target.value)
                          }
                          placeholder="Weight (Y)"
                          className="col-span-5 text-right"
                          readOnly={isReadOnly}
                        />
                        {!isReadOnly && (
                            <Button
                            onClick={() => removeEnvelopePoint(i)}
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive col-span-1"
                            >
                            <Trash2 size={16} />
                            </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {/* Previous buttons were here */}
        </CardFooter>
      </Card>
    </div>
  );
}

export default ConfiguratorTab;
