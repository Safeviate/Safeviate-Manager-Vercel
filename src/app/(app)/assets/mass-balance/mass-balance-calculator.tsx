'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { RotateCw, Plane, Trash2, Save, X, Settings, Download, Calculator, BookOpen, AlertTriangle } from 'lucide-react';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { MassBalanceChart } from './mass-balance-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { isPointInPolygon } from '@/lib/utils';


const isProfileComplete = (profile: AircraftModelProfile) => {
    return profile && profile.stations && profile.cgEnvelope && profile.maxTakeoffWeight;
}

export function MassBalanceCalculator() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [profiles, setProfiles] = useState<AircraftModelProfile[]>([]);
  
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [profileName, setProfileName] = useState('');
  
  const aircraftsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const { data: fetchedAircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

  const profilesQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null), [firestore, tenantId]);
  const { data: fetchedProfiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
  
  useEffect(() => {
    if (fetchedAircrafts) setAircrafts(fetchedAircrafts);
  }, [fetchedAircrafts]);

  useEffect(() => {
    if (fetchedProfiles) setProfiles(fetchedProfiles);
  }, [fetchedProfiles]);

  const aircraftProfile = useMemo(() => {
    if (selectedProfileId) {
      return profiles.find(p => p.id === selectedProfileId);
    }
    if (selectedAircraft) {
        // Find a profile that matches the aircraft model
        return profiles.find(p => p.profileName === selectedAircraft.model) || null;
    }
    return null;
  }, [selectedProfileId, selectedAircraft, profiles]);

  useEffect(() => {
    if (aircraftProfile) {
        setStations(aircraftProfile.stations || []);
        setProfileName(aircraftProfile.profileName || '');
    } else {
        setStations([]);
        setProfileName('');
    }
  }, [aircraftProfile]);
  
  const calculatedValues = useMemo(() => {
    const currentTotalWeight = stations.reduce((acc, station) => acc + (station.weight || 0), 0);
    const currentTotalMoment = stations.reduce((acc, station) => acc + (station.weight || 0) * (station.arm || 0), 0);
    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    
    if (!aircraftProfile || !isProfileComplete(aircraftProfile)) {
        return { totalWeight: currentTotalWeight, totalMoment: currentTotalMoment, centerOfGravity: cg, isWeightOk: false, isCgOk: false };
    }
    
    const cgPoints = (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.x, y: p.y }));
    const isCgOk = isPointInPolygon({ x: cg, y: currentTotalWeight }, cgPoints);
    const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);
    
    return { totalWeight: currentTotalWeight, totalMoment: currentTotalMoment, centerOfGravity: cg, isWeightOk, isCgOk };
  }, [stations, aircraftProfile]);


  const handleStationChange = (index: number, field: keyof Station, value: string | number) => {
    const newStations = [...stations];
    const station = newStations[index];

    if(field === 'weight') {
        const newWeight = Number(value);
        newStations[index] = { ...station, weight: newWeight };
        if (station.type === 'fuel' && station.maxGallons) {
            const gallons = newWeight / FUEL_WEIGHT_PER_GALLON;
            newStations[index] = { ...newStations[index], gallons: parseFloat(gallons.toFixed(2)) };
        }
    } else if (field === 'gallons') {
        const newGallons = Number(value);
        newStations[index] = { ...station, gallons: newGallons };
        if (station.type === 'fuel') {
            const weight = newGallons * FUEL_WEIGHT_PER_GALLON;
            newStations[index] = { ...newStations[index], weight: parseFloat(weight.toFixed(2)) };
        }
    } else {
        newStations[index] = { ...station, [field]: value };
    }
    setStations(newStations);
  };
  
  const handleAssignToAircraft = async () => {
    if (!selectedAircraft || !aircraftProfile) {
        toast({ title: "Error", description: "Please select an aircraft and a profile first.", variant: "destructive" });
        return;
    }
    
    if (!firestore) return;

    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, selectedAircraft.id);
    await updateDocumentNonBlocking(aircraftRef, {
        emptyWeight: aircraftProfile.stations.find(s => s.name === 'Empty Weight')?.weight,
        emptyWeightMoment: (aircraftProfile.stations.find(s => s.name === 'Empty Weight')?.weight || 0) * (aircraftProfile.stations.find(s => s.name === 'Empty Weight')?.arm || 0),
        maxTakeoffWeight: aircraftProfile.maxTakeoffWeight,
        maxLandingWeight: aircraftProfile.maxLandingWeight,
        stationArms: aircraftProfile.stationArms,
        cgEnvelope: aircraftProfile.cgEnvelope?.map(p => ({ cg: p.x, weight: p.y })),
    });

    toast({ title: "Profile Assigned", description: `M&B Profile for ${aircraftProfile.profileName} has been assigned to ${selectedAircraft.tailNumber}.` });
  };

  const handleClearAircraftMandB = async () => {
    if (!selectedAircraft) {
        toast({ title: "Error", description: "Please select an aircraft.", variant: "destructive" });
        return;
    }
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, selectedAircraft.id);
    await updateDocumentNonBlocking(aircraftRef, {
        emptyWeight: null,
        emptyWeightMoment: null,
        maxTakeoffWeight: null,
        maxLandingWeight: null,
        stationArms: null,
        cgEnvelope: null,
    });
    toast({ title: "Aircraft M&B Cleared", description: `Mass and Balance data for ${selectedAircraft.tailNumber} has been cleared.` });
  };

  const handleSaveAsNewProfile = async () => {
      if (!profileName.trim()) {
          toast({ title: "Error", description: "Please enter a profile name.", variant: "destructive" });
          return;
      }
      if (!firestore) return;
      const profilesCollection = collection(firestore, `tenants/${tenantId}/massAndBalance`);
      const newProfileData = {
          profileName: profileName,
          stations: stations,
          // You might want to get these from form fields instead of hardcoding
          cgEnvelope: aircraftProfile?.cgEnvelope || [],
          xMin: aircraftProfile?.xMin || 0,
          xMax: aircraftProfile?.xMax || 100,
          yMin: aircraftProfile?.yMin || 0,
          yMax: aircraftProfile?.yMax || 5000,
          maxTakeoffWeight: aircraftProfile?.maxTakeoffWeight || 0
      };
      await addDocumentNonBlocking(profilesCollection, newProfileData);
      toast({ title: "Profile Saved", description: `New profile "${profileName}" has been created.` });
  };
  
  const handleReset = () => {
    if (aircraftProfile) {
        setStations(aircraftProfile.stations);
    } else {
        setStations([]);
    }
    toast({ title: 'Calculator Reset', description: 'All values have been reset to the loaded profile defaults.' });
  }

  const isLoading = isLoadingAircrafts || isLoadingProfiles;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
            <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Calculator</CardTitle>
                        <div className="flex items-center gap-2">
                             <Select onValueChange={(id) => { setSelectedProfileId(id); setSelectedAircraft(null); }} value={selectedProfileId || ''}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Load Profile..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <span className='text-sm text-muted-foreground'>OR</span>
                             <Select onValueChange={(id) => { setSelectedAircraft(aircrafts.find(a => a.id === id) || null); setSelectedProfileId(null); }} value={selectedAircraft?.id || ''}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Load Aircraft..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {aircrafts.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber} ({a.model})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stations.map((station, index) => (
                        <div key={station.id || index} className="grid grid-cols-[1fr,1fr,1fr,auto] items-center gap-4">
                             <div className="flex items-center gap-2">
                                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {index + 1}
                                </span>
                                <p className="font-medium truncate">{station.name}</p>
                             </div>
                            
                            <Input
                                type="number"
                                value={station.weight || ''}
                                onChange={(e) => handleStationChange(index, 'weight', e.target.value)}
                                placeholder="Weight (lbs)"
                                className="text-right"
                            />

                           <div className='relative'>
                                <Input
                                    type="number"
                                    value={station.arm || ''}
                                    readOnly
                                    className="text-right bg-muted"
                                />
                           </div>
                            <Button variant="ghost" size="icon" disabled><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                    ))}
                </CardContent>
                 <CardFooter className="flex-wrap justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                         <Button onClick={handleReset} variant="outline">
                            <RotateCw className="mr-2 h-4 w-4" /> Save
                        </Button>
                        <Button variant="outline" onClick={handleAssignToAircraft} disabled={!selectedAircraft || !aircraftProfile}>
                            <Plane className="mr-2 h-4 w-4" /> Assign to Aircraft
                        </Button>
                         <Button variant="destructive" onClick={handleClearAircraftMandB} disabled={!selectedAircraft}>
                            <X className="mr-2 h-4 w-4" /> Clear Aircraft M&B
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Input 
                            value={profileName} 
                            onChange={(e) => setProfileName(e.target.value)} 
                            placeholder="New Profile Name"
                            className="w-48"
                        />
                        <Button onClick={handleSaveAsNewProfile}><Save className="mr-2 h-4 w-4"/> Save as New Profile</Button>
                    </div>
                </CardFooter>
            </Card>
        </div>

      <div className="space-y-6">
        {isLoading ? (
            <Skeleton className='h-96 w-full' />
        ) : !aircraftProfile || !isProfileComplete(aircraftProfile) ? (
            <Card className="h-96">
                <CardHeader>
                    <CardTitle>Mass & Balance</CardTitle>
                </CardHeader>
                <CardContent className="flex h-full items-center justify-center flex-col gap-4 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Please load an aircraft or a complete M&B profile to view the chart and summary.</p>
                </CardContent>
            </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-lg", calculatedValues.isWeightOk ? "bg-green-100 dark:bg-green-900/50" : "bg-red-100 dark:bg-red-900/50")}>
                    <Label>Total Weight</Label>
                    <p className="text-2xl font-bold">{calculatedValues.totalWeight.toFixed(1)} lbs</p>
                    <p className="text-xs text-muted-foreground">Max: {aircraftProfile.maxTakeoffWeight} lbs</p>
                </div>
                 <div className={cn("p-4 rounded-lg", calculatedValues.isCgOk ? "bg-green-100 dark:bg-green-900/50" : "bg-red-100 dark:bg-red-900/50")}>
                    <Label>Center of Gravity</Label>
                    <p className="text-2xl font-bold">{calculatedValues.centerOfGravity.toFixed(2)} in</p>
                     <p className="text-xs text-muted-foreground">Moment: {calculatedValues.totalMoment.toFixed(0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CG Envelope</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                  <MassBalanceChart 
                    profile={aircraftProfile}
                    currentCg={{ x: calculatedValues.centerOfGravity, y: calculatedValues.totalWeight }}
                  />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
