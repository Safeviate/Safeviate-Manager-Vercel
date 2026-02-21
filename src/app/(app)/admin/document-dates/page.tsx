
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/use-debounce';
import type { StudentMilestoneSettings } from '@/types/training';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

export type WarningPeriod = {
  period: number;
  color: string;
};

export type DocumentExpirySettings = {
  id: string;
  defaultColor: string;
  expiredColor: string;
  warningPeriods: WarningPeriod[];
};

const defaultPeriodColor = '#facc15'; // yellow-400
const defaultSafeColor = '#22c55e'; // green-500
const defaultExpiredColor = '#ef4444'; // red-500

const defaultMilestones = [
    { milestone: 10, warningHours: 7 },
    { milestone: 20, warningHours: 17 },
    { milestone: 30, warningHours: 27 },
    { milestone: 40, warningHours: 37 },
];

const defaultFiftyHourWarnings: HourWarning[] = [
    { hours: 20, color: '#60a5fa' },
    { hours: 10, color: '#facc15' },
    { hours: 5, color: '#f97316' },
    { hours: 2, color: '#ef4444' },
];

const defaultHundredHourWarnings: HourWarning[] = [
    { hours: 30, color: '#60a5fa' },
    { hours: 20, color: '#facc15' },
    { hours: 10, color: '#f97316' },
    { hours: 5, color: '#ef4444' },
];

export default function DocumentDatesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  
  // --- Document Expiry State & Logic ---
  const expirySettingsId = 'document-expiry';
  const expirySettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', expirySettingsId) : null), [firestore, tenantId]);
  const { data: expirySettings, isLoading: isLoadingExpiry, error: expiryError } = useDoc<DocumentExpirySettings>(expirySettingsRef);
  const [newPeriod, setNewPeriod] = useState('');
  const [newPeriodColor, setNewPeriodColor] = useState(defaultPeriodColor);
  const [defaultColorState, setDefaultColorState] = useState(expirySettings?.defaultColor || defaultSafeColor);
  const [expiredColorState, setExpiredColorState] = useState(expirySettings?.expiredColor || defaultExpiredColor);
  const [periodColors, setPeriodColors] = useState<Record<number, string>>({});
  const debouncedDefaultColor = useDebounce(defaultColorState, 500);
  const debouncedExpiredColor = useDebounce(expiredColorState, 500);
  const debouncedPeriodColors = useDebounce(periodColors, 500);

  // --- Milestone State & Logic ---
  const milestoneSettingsId = 'student-milestones';
  const milestoneSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', milestoneSettingsId) : null), [firestore, tenantId]);
  const { data: milestoneSettings, isLoading: isLoadingMilestones, error: milestoneError } = useDoc<StudentMilestoneSettings>(milestoneSettingsRef);
  const [milestoneState, setMilestoneState] = useState(milestoneSettings?.milestones || defaultMilestones);
  const debouncedMilestoneState = useDebounce(milestoneState, 500);

  // --- Inspection Warnings State & Logic ---
  const inspectionSettingsId = 'inspection-warnings';
  const inspectionSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', inspectionSettingsId) : null), [firestore, tenantId]);
  const { data: inspectionSettings, isLoading: isLoadingInspections, error: inspectionError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);
  const [fiftyHourWarnings, setFiftyHourWarnings] = useState<HourWarning[]>([]);
  const [hundredHourWarnings, setHundredHourWarnings] = useState<HourWarning[]>([]);
  const [newFiftyHour, setNewFiftyHour] = useState('');
  const [newFiftyHourColor, setNewFiftyHourColor] = useState('#facc15');
  const [newHundredHour, setNewHundredHour] = useState('');
  const [newHundredHourColor, setNewHundredHourColor] = useState('#f97316');


  useEffect(() => {
    if (expirySettings) {
      setDefaultColorState(expirySettings.defaultColor || defaultSafeColor);
      setExpiredColorState(expirySettings.expiredColor || defaultExpiredColor);
      const initialColors = (expirySettings.warningPeriods || []).reduce((acc, p) => {
        acc[p.period] = p.color;
        return acc;
      }, {} as Record<number, string>);
      setPeriodColors(initialColors);
    }
  }, [expirySettings]);
  
  useEffect(() => {
      if (!expirySettingsRef || debouncedDefaultColor === expirySettings?.defaultColor || isLoadingExpiry) return;
      setDocumentNonBlocking(expirySettingsRef, { defaultColor: debouncedDefaultColor }, { merge: true });
  }, [debouncedDefaultColor, expirySettingsRef, expirySettings?.defaultColor, isLoadingExpiry]);

  useEffect(() => {
    if (!expirySettingsRef || debouncedExpiredColor === expirySettings?.expiredColor || isLoadingExpiry) return;
    setDocumentNonBlocking(expirySettingsRef, { expiredColor: debouncedExpiredColor }, { merge: true });
  }, [debouncedExpiredColor, expirySettingsRef, expirySettings?.expiredColor, isLoadingExpiry]);

  useEffect(() => {
      if (!expirySettingsRef || !expirySettings?.warningPeriods || Object.keys(debouncedPeriodColors).length === 0 || isLoadingExpiry) return;
      const hasChanged = expirySettings.warningPeriods.some(p => p.color !== debouncedPeriodColors[p.period] && debouncedPeriodColors[p.period]);
      if (hasChanged) {
        const newPeriods = expirySettings.warningPeriods.map(p => ({ ...p, color: debouncedPeriodColors[p.period] || p.color }));
        setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });
      }
  }, [debouncedPeriodColors, expirySettings, expirySettingsRef, isLoadingExpiry]);

  useEffect(() => {
      if (milestoneSettings) {
          setMilestoneState(milestoneSettings.milestones.length > 0 ? milestoneSettings.milestones : defaultMilestones);
      }
  }, [milestoneSettings]);

  useEffect(() => {
    if (!milestoneSettingsRef || isLoadingMilestones) return;
    if (JSON.stringify(debouncedMilestoneState) !== JSON.stringify(milestoneSettings?.milestones)) {
        setDocumentNonBlocking(milestoneSettingsRef, { milestones: debouncedMilestoneState }, { merge: true });
    }
  }, [debouncedMilestoneState, milestoneSettingsRef, milestoneSettings, isLoadingMilestones]);

  useEffect(() => {
    if (inspectionSettings) {
        setFiftyHourWarnings(inspectionSettings.fiftyHourWarnings || []);
        setHundredHourWarnings(inspectionSettings.oneHundredHourWarnings || []);
    } else if (!isLoadingInspections && inspectionSettingsRef) {
        setDocumentNonBlocking(inspectionSettingsRef, { 
            id: inspectionSettingsId,
            fiftyHourWarnings: defaultFiftyHourWarnings,
            oneHundredHourWarnings: defaultHundredHourWarnings,
        }, { merge: false });
    }
  }, [inspectionSettings, isLoadingInspections, inspectionSettingsRef]);


  const handleAddPeriod = () => {
    const period = parseInt(newPeriod, 10);
    if (isNaN(period) || period <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Number', description: 'Please enter a positive number of days.' });
      return;
    }
    if (!expirySettingsRef) return;
    const currentPeriods = expirySettings?.warningPeriods || [];
    if (currentPeriods.some((p) => p.period === period)) {
      toast({ variant: 'destructive', title: 'Duplicate Period', description: `The warning period for ${period} days already exists.` });
      return;
    }
    const updatedWarningPeriods = [...currentPeriods, { period, color: newPeriodColor }].sort((a, b) => a.period - b.period);
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: updatedWarningPeriods }, { merge: true });
    toast({ title: 'Warning Period Added', description: `${period} days has been added.` });
    setNewPeriod('');
    setNewPeriodColor(defaultPeriodColor);
  };

  const handleRemovePeriod = (periodToRemove: number) => {
    if (!expirySettingsRef) return;
    const newPeriods = (expirySettings?.warningPeriods || []).filter((p) => p.period !== periodToRemove);
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });
    toast({ title: 'Warning Period Removed', description: `${periodToRemove} days has been removed.` });
  };
  
  const handleMilestoneWarningChange = (milestoneValue: number, warningHours: string) => {
    const hours = parseInt(warningHours, 10);
    if (!isNaN(hours)) {
        setMilestoneState(prev => prev.map(m => m.milestone === milestoneValue ? { ...m, warningHours: hours } : m));
    }
  }

  const handleAddInspectionWarning = (type: '50hr' | '100hr') => {
    if (!inspectionSettingsRef) return;
    const hoursStr = type === '50hr' ? newFiftyHour : newHundredHour;
    const newColor = type === '50hr' ? newFiftyHourColor : newHundredHourColor;
    const hours = parseInt(hoursStr, 10);

    if (isNaN(hours) || hours <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Number', description: 'Please enter a positive number of hours.' });
        return;
    }

    const fieldKey = type === '50hr' ? 'fiftyHourWarnings' : 'oneHundredHourWarnings';
    const currentWarnings = inspectionSettings?.[fieldKey] || [];
    if (currentWarnings.some((w) => w.hours === hours)) {
        toast({ variant: 'destructive', title: 'Duplicate Warning', description: `A warning for ${hours} hours already exists.` });
        return;
    }

    const updatedWarnings = [...currentWarnings, { hours, color: newColor }].sort((a, b) => b.hours - a.hours);
    setDocumentNonBlocking(inspectionSettingsRef, { [fieldKey]: updatedWarnings }, { merge: true });

    toast({ title: 'Inspection Warning Added' });

    if (type === '50hr') {
        setNewFiftyHour('');
        setNewFiftyHourColor('#facc15');
    } else {
        setNewHundredHour('');
        setNewHundredHourColor('#f97316');
    }
  };

  const handleRemoveInspectionWarning = (type: '50hr' | '100hr', hoursToRemove: number) => {
    if (!inspectionSettingsRef) return;
    const fieldKey = type === '50hr' ? 'fiftyHourWarnings' : 'oneHundredHourWarnings';
    const newWarnings = (inspectionSettings?.[fieldKey] || []).filter((w) => w.hours !== hoursToRemove);
    setDocumentNonBlocking(inspectionSettingsRef, { [fieldKey]: newWarnings }, { merge: true });
    toast({ title: 'Inspection Warning Removed' });
  };


  const isLoading = isLoadingExpiry || isLoadingMilestones || isLoadingInspections;
  const error = expiryError || milestoneError || inspectionError;

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading settings: {error.message}</p>;
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Expiry Warnings</CardTitle>
          <CardDescription>
            Configure automatic warnings for documents that are approaching their expiration date.
            Notifications will be triggered based on these periods and their assigned colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
              <div className="space-y-2">
                  <Label>Default Safe Color</Label>
                  <div className='flex items-center gap-4 p-2 border rounded-lg'>
                    <div className="relative h-8 w-8 rounded-full border cursor-pointer" style={{ backgroundColor: defaultColorState }}>
                        <Input type="color" value={defaultColorState} onChange={(e) => setDefaultColorState(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                      </div>
                      <p className="text-sm text-muted-foreground">Color for documents not within any warning period.</p>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label>Expired Color</Label>
                  <div className='flex items-center gap-4 p-2 border rounded-lg'>
                    <div className="relative h-8 w-8 rounded-full border cursor-pointer" style={{ backgroundColor: expiredColorState }}>
                        <Input type="color" value={expiredColorState} onChange={(e) => setExpiredColorState(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                      </div>
                      <p className="text-sm text-muted-foreground">Color for documents that have passed their expiration date.</p>
                  </div>
              </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="warning-period">New Warning Period</Label>
            <div className="flex gap-2">
              <Input id="warning-period" type="number" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} placeholder="e.g., 30 (days)" className="w-48" onKeyDown={(e) => e.key === 'Enter' && handleAddPeriod()} />
              <Input id="warning-color" type="color" value={newPeriodColor} onChange={(e) => setNewPeriodColor(e.target.value)} className="p-1 h-10 w-12" />
              <Button onClick={handleAddPeriod} className="flex-grow">Add Period</Button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Current Warning Periods (Closest to expiry takes precedence)
            </h4>
            <div className="flex flex-col gap-2 p-4 border rounded-lg min-h-16">
              {(expirySettings?.warningPeriods || []).length > 0 ? (
                (expirySettings?.warningPeriods || []).map(({ period, color }) => (
                  <div key={period} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                      <div className="flex items-center gap-3">
                          <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: periodColors[period] || color }}>
                            <Input type="color" value={periodColors[period] || color} onChange={(e) => setPeriodColors(prev => ({...prev, [period]: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                          </div>
                          <Badge variant="secondary" className="flex items-center gap-2 text-base py-1">{period} days</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-destructive/20" onClick={() => handleRemovePeriod(period)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Remove {period} days</span>
                      </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground w-full text-center">No warning periods configured.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Hour Milestones</CardTitle>
          <CardDescription>Set the warning threshold (in hours) for student flight time milestones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {milestoneState.map(({ milestone, warningHours }) => (
                <div key={milestone} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor={`milestone-${milestone}`} className="font-semibold text-base">{milestone} Hour Milestone</Label>
                    <div className="flex items-center gap-2">
                        <Label htmlFor={`milestone-${milestone}`} className="text-sm text-muted-foreground">Warn at</Label>
                        <Input
                            id={`milestone-${milestone}`}
                            type="number"
                            value={warningHours}
                            onChange={(e) => handleMilestoneWarningChange(milestone, e.target.value)}
                            className="w-24"
                        />
                         <Label className="text-sm text-muted-foreground">hours</Label>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Aircraft Inspection Warnings</CardTitle>
            <CardDescription>
                Configure warnings for upcoming 50-hour and 100-hour inspections based on hours remaining.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* 50 Hour Section */}
            <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold">50 Hour Inspection</h4>
                <div className="space-y-2">
                    <Label htmlFor="fifty-hour-warning">New Warning</Label>
                    <div className="flex gap-2">
                        <Input id="fifty-hour-warning" type="number" value={newFiftyHour} onChange={(e) => setNewFiftyHour(e.target.value)} placeholder="e.g., 10 (hours remaining)" className="w-48" onKeyDown={(e) => e.key === 'Enter' && handleAddInspectionWarning('50hr')} />
                        <Input id="fifty-hour-color" type="color" value={newFiftyHourColor} onChange={(e) => setNewFiftyHourColor(e.target.value)} className="p-1 h-10 w-12" />
                        <Button onClick={() => handleAddInspectionWarning('50hr')} className="flex-grow">Add Warning</Button>
                    </div>
                </div>
                <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">
                        Current Warnings (Highest hours takes precedence)
                    </h5>
                    <div className="flex flex-col gap-2 min-h-16">
                        {fiftyHourWarnings.map(({ hours, color }) => (
                            <div key={hours} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: color }}>
                                        <Input type="color" value={color} onChange={(e) => {
                                            const newWarnings = fiftyHourWarnings.map(w => w.hours === hours ? { ...w, color: e.target.value } : w);
                                            setDocumentNonBlocking(inspectionSettingsRef!, { fiftyHourWarnings: newWarnings }, { merge: true });
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                                    </div>
                                    <Badge variant="secondary" className="flex items-center gap-2 text-base py-1">{hours} hrs remaining</Badge>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-destructive/20" onClick={() => handleRemoveInspectionWarning('50hr', hours)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Remove {hours} hours</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 100 Hour Section */}
            <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold">100 Hour Inspection</h4>
                 <div className="space-y-2">
                    <Label htmlFor="hundred-hour-warning">New Warning</Label>
                    <div className="flex gap-2">
                        <Input id="hundred-hour-warning" type="number" value={newHundredHour} onChange={(e) => setNewHundredHour(e.target.value)} placeholder="e.g., 20 (hours remaining)" className="w-48" onKeyDown={(e) => e.key === 'Enter' && handleAddInspectionWarning('100hr')} />
                        <Input id="hundred-hour-color" type="color" value={newHundredHourColor} onChange={(e) => setNewHundredHourColor(e.target.value)} className="p-1 h-10 w-12" />
                        <Button onClick={() => handleAddInspectionWarning('100hr')} className="flex-grow">Add Warning</Button>
                    </div>
                </div>
                <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">
                        Current Warnings (Highest hours takes precedence)
                    </h5>
                    <div className="flex flex-col gap-2 min-h-16">
                        {hundredHourWarnings.map(({ hours, color }) => (
                            <div key={hours} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: color }}>
                                        <Input type="color" value={color} onChange={(e) => {
                                             const newWarnings = hundredHourWarnings.map(w => w.hours === hours ? { ...w, color: e.target.value } : w);
                                             setDocumentNonBlocking(inspectionSettingsRef!, { oneHundredHourWarnings: newWarnings }, { merge: true });
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                                    </div>
                                    <Badge variant="secondary" className="flex items-center gap-2 text-base py-1">{hours} hrs remaining</Badge>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-destructive/20" onClick={() => handleRemoveInspectionWarning('100hr', hours)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Remove {hours} hours</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    