
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Save, Wrench, Plane, RotateCw } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { MassBalanceChart } from './mass-balance-chart';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { isPointInPolygon } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { updateDoc, doc } from 'firebase/firestore';


const SaveProfileDialog = ({ onSave }: { onSave: (name: string) => void }) => {
  const [name, setName] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Save className="mr-2" /> Save as New Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Profile</DialogTitle>
          <DialogDescription>
            Enter a name for this new Mass & Balance profile.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., C172 - Standard Load"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={() => onSave(name)} disabled={!name.trim()}>
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AssignToAircraftDialog = ({ aircrafts, onAssign }: { aircrafts: Aircraft[], onAssign: (aircraftId: string) => void }) => {
    const [selectedAircraftId, setSelectedAircraftId] = useState('');
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Plane className="mr-2" /> Assign to Aircraft</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign M&B to Aircraft</DialogTitle>
                    <DialogDescription>
                        Select an aircraft to permanently assign this mass and balance configuration to it. This will overwrite its current empty weight, moment, and station arms.
                    </DialogDescription>
                </DialogHeader>
                <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an aircraft..." />
                    </SelectTrigger>
                    <SelectContent>
                        {aircrafts.map(ac => <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.model})</SelectItem>)}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <DialogClose asChild>
                       <Button onClick={() => onAssign(selectedAircraftId)} disabled={!selectedAircraftId}>Confirm & Assign</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface MassBalanceCalculatorProps {
  aircraftProfile: AircraftModelProfile;
  aircrafts: Aircraft[];
  onProfileSave: (profileData: Omit<AircraftModelProfile, 'id'>) => Promise<void>;
  onProfileLoad: (profile: AircraftModelProfile) => void;
  selectedAircraft: Aircraft | null;
}

export function MassBalanceCalculator({ aircraftProfile, aircrafts, onProfileSave, onProfileLoad, selectedAircraft }: MassBalanceCalculatorProps) {
  const [stations, setStations] = useState<Station[]>(aircraftProfile.stations || []);
  const debouncedStations = useDebounce(stations, 500);
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  useEffect(() => {
    setStations(aircraftProfile.stations || []);
  }, [aircraftProfile]);

  const { totalWeight, totalMoment, centerOfGravity, isWeightInvalid, isCgInvalid } = useMemo(() => {
    const currentTotalWeight = debouncedStations.reduce((acc, station) => acc + (station.weight || 0), 0);
    const currentTotalMoment = debouncedStations.reduce((acc, station) => acc + (station.weight || 0) * (station.arm || 0), 0);
    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    
    const cgEnvelopePoints = (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.x, y: p.y }));
    const isCGInEnvelope = isPointInPolygon({ x: cg, y: currentTotalWeight }, cgEnvelopePoints);

    const isWeightOk = currentTotalWeight <= (aircraftProfile.yMax || Infinity);

    return {
      totalWeight: currentTotalWeight,
      totalMoment: currentTotalMoment,
      centerOfGravity: cg,
      isWeightInvalid: !isWeightOk,
      isCgInvalid: !isCGInEnvelope,
    };
  }, [debouncedStations, aircraftProfile]);
  
  const calculatedCgPoint = { x: centerOfGravity, y: totalWeight };

  const handleStationChange = (index: number, field: keyof Station, value: string | number) => {
    const newStations = [...stations];
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (field === 'weight') {
      newStations[index].weight = isNaN(numValue) ? 0 : numValue;
      if (newStations[index].type === 'fuel' && newStations[index].gallons !== undefined) {
        newStations[index].gallons = parseFloat((newStations[index].weight / FUEL_WEIGHT_PER_GALLON).toFixed(2));
      }
    } else if (field === 'gallons') {
       newStations[index].gallons = isNaN(numValue) ? 0 : numValue;
       newStations[index].weight = parseFloat(((newStations[index].gallons || 0) * FUEL_WEIGHT_PER_GALLON).toFixed(2));
    } else if (field === 'arm') {
       newStations[index].arm = isNaN(numValue) ? 0 : numValue;
    } else if (field === 'name') {
       newStations[index].name = value as string;
    }
    setStations(newStations);
  };

  const addStation = (type: 'weight' | 'fuel') => {
    const newStation: Station = {
      id: Date.now(),
      name: type === 'fuel' ? 'New Fuel Tank' : 'New Station',
      weight: 0,
      arm: 0,
      type: type,
    };
    if (type === 'fuel') {
      newStation.gallons = 0;
      newStation.maxGallons = 50;
    }
    setStations([...stations, newStation]);
  };

  const removeStation = (index: number) => {
    setStations(stations.filter((_, i) => i !== index));
  };
  
  const handleResetCalculatorState = () => {
      onProfileLoad(aircraftProfile);
      toast({ title: 'Calculator Reset', description: 'The calculator has been reset to the loaded profile.' });
  }

  const handleSaveProfile = (name: string) => {
    const profileData: Omit<AircraftModelProfile, 'id'> = {
      profileName: name,
      stations: stations,
      cgEnvelope: aircraftProfile.cgEnvelope,
      xMin: aircraftProfile.xMin,
      xMax: aircraftProfile.xMax,
      yMin: aircraftProfile.yMin,
      yMax: aircraftProfile.yMax,
    };
    onProfileSave(profileData);
  };

  const handleAssignToAircraft = async (aircraftId: string) => {
      if (!firestore) {
          toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available' });
          return;
      }
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
      const emptyWeight = stations.find(s => s.name.toLowerCase() === 'empty weight')?.weight || 0;
      const emptyWeightMoment = (stations.find(s => s.name.toLowerCase() === 'empty weight')?.weight || 0) * (stations.find(s => s.name.toLowerCase() === 'empty weight')?.arm || 0);

      const payload = {
          emptyWeight: emptyWeight,
          emptyWeightMoment: emptyWeightMoment,
          // You may want to save station arms here if they are dynamic per aircraft
      };
      
      await updateDoc(aircraftRef, payload);
      toast({ title: "Aircraft Updated", description: "The aircraft's M&B has been updated with the current values."})
  }
  
  const handleClearAircraftMAndB = async () => {
    if (!firestore || !selectedAircraft) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, selectedAircraft.id);
    await updateDoc(aircraftRef, {
        emptyWeight: null,
        emptyWeightMoment: null,
    });
    // This re-triggers a load, which will clear the calculator if the aircraft was the source
    onProfileLoad({ ...aircraftProfile, stations: aircraftProfile.stations.map(s => s.name.toLowerCase() === 'empty weight' ? {...s, weight: 0, arm: 0} : s) });
    toast({ title: "Aircraft M&B Cleared", description: "The aircraft's specific M&B has been removed."})
  }

  return (
    <>
      <MassBalanceChart
        profile={aircraftProfile}
        cgPoint={calculatedCgPoint}
        isCgInvalid={isCgInvalid}
      />

      <Card>
        <CardHeader>
          <CardTitle>Stations</CardTitle>
          <CardDescription>
            Enter the weight and arm for each station.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Station</TableHead>
                <TableHead>Weight (lbs)</TableHead>
                <TableHead>Arm (in)</TableHead>
                <TableHead>Moment (lb-in)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((station, index) => {
                const isFuel = station.type === 'fuel';
                return (
                  <TableRow key={station.id}>
                    <TableCell>
                      <Input
                        value={station.name}
                        onChange={(e) => handleStationChange(index, 'name', e.target.value)}
                        className="font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={station.weight.toString()}
                        onChange={(e) => handleStationChange(index, 'weight', e.target.value)}
                      />
                       {isFuel && (
                         <div className="flex items-center gap-2 mt-2">
                             <Input
                                type="number"
                                value={station.gallons?.toString() || ''}
                                onChange={(e) => handleStationChange(index, 'gallons', e.target.value)}
                                className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">GAL</span>
                         </div>
                       )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={station.arm.toString()}
                        onChange={(e) => handleStationChange(index, 'arm', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      {((station.weight || 0) * (station.arm || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeStation(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => addStation('weight')}>
              <Plus className="mr-2" /> Add Weight Station
            </Button>
            <Button variant="outline" onClick={() => addStation('fuel')}>
              <Plus className="mr-2" /> Add Fuel Station
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t pt-6">
            <Button variant="outline" onClick={handleResetCalculatorState}>
                <RotateCw className="mr-2 h-4 w-4" /> Save
            </Button>
            <AssignToAircraftDialog
            aircrafts={aircrafts}
            onAssign={handleAssignToAircraft}
            />
            <Button
            variant="destructive"
            onClick={handleClearAircraftMAndB}
            disabled={!selectedAircraft}
            >
            <Wrench className="mr-2 h-4 w-4" /> Clear Aircraft M&B
            </Button>
            <SaveProfileDialog onSave={handleSaveProfile} />
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Weight</CardDescription>
            <CardTitle className={`text-3xl ${isWeightInvalid ? 'text-destructive' : ''}`}>
              {totalWeight.toFixed(2)} lbs
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Moment</CardDescription>
            <CardTitle className="text-3xl">
              {totalMoment.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Center of Gravity</CardDescription>
            <CardTitle className={`text-3xl ${isCgInvalid ? 'text-destructive' : ''}`}>
              {centerOfGravity.toFixed(2)} in
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Max Takeoff Weight</CardDescription>
                <CardTitle className="text-3xl">
                    {aircraftProfile.yMax?.toFixed(2) ?? 'N/A'} lbs
                </CardTitle>
            </CardHeader>
        </Card>
      </div>

      {(isCgInvalid || isWeightInvalid) && (
        <Badge variant="destructive" className="flex items-center gap-2 text-base p-4">
          <AlertCircle />
          {isCgInvalid && "Center of Gravity is outside the envelope. "}
          {isWeightInvalid && "Total weight exceeds maximum takeoff weight."}
        </Badge>
      )}
    </>
  );
}
