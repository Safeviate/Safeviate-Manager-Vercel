
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, addDoc, deleteDoc } from 'firebase/firestore';
import type { Aircraft, AircraftModelProfile } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';
import { MassBalanceChart } from './mass-balance-chart';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface StationState {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'weight' | 'fuel';
  gallons?: number;
  maxGallons?: number;
}

interface MassBalanceCalculatorProps {
  aircrafts: Aircraft[];
}

export function MassBalanceCalculator({ aircrafts }: MassBalanceCalculatorProps) {
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [aircraftProfile, setAircraftProfile] = useState<Aircraft | null>(null);
  const [stations, setStations] = useState<StationState[]>([]);
  const [fuelGallons, setFuelGallons] = useState(0);

  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/massAndBalance`)) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates } = useCollection<AircraftModelProfile>(templatesQuery);

  useEffect(() => {
    if (selectedAircraftId) {
      const profile = aircrafts.find(p => p.id === selectedAircraftId);
      if (profile) {
        setAircraftProfile(profile);
        const initialStations = (profile.stations || []).map(s => ({ ...s, weight: s.type === 'fuel' ? 0 : s.weight || 0 }));
        setStations(initialStations);
        const initialFuelStation = initialStations.find(s => s.type === 'fuel');
        setFuelGallons(initialFuelStation?.gallons || 0);
      }
    } else {
      setAircraftProfile(null);
      setStations([]);
      setFuelGallons(0);
    }
  }, [selectedAircraftId, aircrafts]);

  const handleStationWeightChange = (id: number, newWeightStr: string) => {
    const newWeight = parseFloat(newWeightStr) || 0;
    setStations(prev =>
      prev.map(station =>
        station.id === id ? { ...station, weight: newWeight } : station
      )
    );
  };
  
  const handleFuelGallonsChange = (newGallonsStr: string) => {
      const newGallons = parseFloat(newGallonsStr) || 0;
      const fuelStation = stations.find(s => s.type === 'fuel');
      const maxGallons = fuelStation?.maxGallons || Infinity;
      setFuelGallons(Math.min(newGallons, maxGallons));
  };


  const { totalWeight, totalMoment, centerOfGravity, isCGInEnvelope, isWeightOk } = useMemo(() => {
    if (!aircraftProfile) {
        return { totalWeight: 0, totalMoment: 0, centerOfGravity: 0, isCGInEnvelope: false, isWeightOk: true };
    }
    const { emptyWeight = 0, emptyWeightMoment = 0 } = aircraftProfile;
    let currentTotalWeight = emptyWeight;
    let currentTotalMoment = emptyWeightMoment;

    if (stations) {
      stations.forEach(station => {
          if (station.type === 'fuel') {
              const fuelWeight = fuelGallons * FUEL_WEIGHT_PER_GALLON;
              currentTotalWeight += fuelWeight;
              currentTotalMoment += fuelWeight * station.arm;
          } else {
              currentTotalWeight += station.weight;
              currentTotalMoment += station.weight * station.arm;
          }
      });
    }

    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    const cgEnvelopePoints = (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
    const isCGInEnvelope = isPointInPolygon({ x: cg, y: currentTotalWeight }, cgEnvelopePoints);
    const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);
    
    return {
      totalWeight: currentTotalWeight,
      totalMoment: currentTotalMoment,
      centerOfGravity: cg,
      isCGInEnvelope,
      isWeightOk,
    };
  }, [aircraftProfile, stations, fuelGallons]);

  const [templateName, setTemplateName] = useState('');

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Template Name Required',
        description: 'Please enter a name for the new template.',
      });
      return;
    }
    if (!aircraftProfile || !firestore) return;

    const newTemplate: Omit<AircraftModelProfile, 'id'> = {
      profileName: templateName,
      stations: stations.map(s => ({...s})),
      cgEnvelope: aircraftProfile.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [],
      xMin: (aircraftProfile.cgEnvelope || []).reduce((min, p) => Math.min(min, p.cg), Infinity),
      xMax: (aircraftProfile.cgEnvelope || []).reduce((max, p) => Math.max(max, p.cg), -Infinity),
      yMin: (aircraftProfile.cgEnvelope || []).reduce((min, p) => Math.min(min, p.weight), Infinity),
      yMax: (aircraftProfile.cgEnvelope || []).reduce((max, p) => Math.max(max, p.weight), -Infinity),
    };
    
    const templatesCollection = collection(firestore, `tenants/${tenantId}/massAndBalance`);
    addDocumentNonBlocking(templatesCollection, newTemplate);
    toast({
      title: 'Template Saved',
      description: `Template "${templateName}" has been saved.`,
    });
    setTemplateName('');
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    if (!firestore) return;
    const templateDoc = doc(firestore, `tenants/${tenantId}/massAndBalance`, templateId);
    deleteDocumentNonBlocking(templateDoc);
    toast({
        title: 'Template Deleted',
    });
  }

  const calculatedCg = { x: centerOfGravity, y: totalWeight };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aircraft & Template Selection</CardTitle>
          <CardDescription>Select an aircraft to load its mass and balance profile.</CardDescription>
        </CardHeader>
        <CardContent>
           <Select onValueChange={setSelectedAircraftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an aircraft profile..." />
              </SelectTrigger>
              <SelectContent>
                {aircrafts.map(ac => (
                  <SelectItem key={ac.id} value={ac.id}>
                    {ac.tailNumber} ({ac.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </CardContent>
      </Card>

      {!aircraftProfile ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Please select an aircraft profile to begin calculations.
          </CardContent>
        </Card>
      ) : (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading Stations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Empty Weight</Label>
                            <Input value={`${aircraftProfile.emptyWeight || 0} lbs @ ${aircraftProfile.emptyWeightMoment || 0} lbs-in`} readOnly disabled />
                        </div>
                        {stations.map(station => (
                            <div key={station.id} className="space-y-2">
                                <Label htmlFor={`station-${station.id}`}>{station.name} (Arm: {station.arm} in)</Label>
                                {station.type === 'fuel' ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                          id={`station-${station.id}`}
                                          type="number"
                                          value={fuelGallons}
                                          onChange={(e) => handleFuelGallonsChange(e.target.value)}
                                          max={station.maxGallons}
                                        />
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            / {station.maxGallons} gal
                                        </span>
                                    </div>
                                ) : (
                                    <Input
                                      id={`station-${station.id}`}
                                      type="number"
                                      value={station.weight}
                                      onChange={e => handleStationWeightChange(station.id, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <div>
                  <MassBalanceChart profile={aircraftProfile} calculatedCg={calculatedCg} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={!isWeightOk ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle>Total Weight</CardTitle>
                  <CardDescription>Max: {aircraftProfile.maxTakeoffWeight || 'N/A'} lbs</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader>
                  <CardTitle>Total Moment</CardTitle>
                  <CardDescription>Weight x Arm</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalMoment.toFixed(2)} lbs-in</p>
                </CardContent>
              </Card>
              <Card className={!isCGInEnvelope ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle>Center of Gravity</CardTitle>
                  <CardDescription>Moment / Weight</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{centerOfGravity.toFixed(2)} in</p>
                </CardContent>
              </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Save & Load Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input placeholder="New template name..." value={templateName} onChange={e => setTemplateName(e.target.value)} />
                        <Button onClick={handleSaveAsTemplate}>Save Current as Template</Button>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-4">
                     <Label>Saved Templates</Label>
                    {savedTemplates && savedTemplates.map(template => (
                        <div key={template.id} className="flex items-center justify-between w-full">
                            <span>{template.profileName}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => console.log('Load template logic to be implemented')}>Load</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
                            </div>
                        </div>
                    ))}
                 </CardFooter>
            </Card>
        </>
      )}
    </div>
  );
}
