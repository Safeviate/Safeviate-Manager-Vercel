'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    { hours: 20, color: '#60a5fa', foregroundColor: '#ffffff' },
    { hours: 10, color: '#facc15', foregroundColor: '#000000' },
    { hours: 5, color: '#f97316', foregroundColor: '#ffffff' },
    { hours: 2, color: '#ef4444', foregroundColor: '#ffffff' },
];

const defaultHundredHourWarnings: HourWarning[] = [
    { hours: 30, color: '#60a5fa', foregroundColor: '#ffffff' },
    { hours: 20, color: '#facc15', foregroundColor: '#000000' },
    { hours: 10, color: '#f97316', foregroundColor: '#ffffff' },
    { hours: 5, color: '#ef4444', foregroundColor: '#ffffff' },
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
  const [newFiftyHourFgColor, setNewFiftyHourFgColor] = useState('#000000');
  const [newHundredHour, setNewHundredHour] = useState('');
  const [newHundredHourColor, setNewHundredHourColor] = useState('#f97316');
  const [newHundredHourFgColor, setNewHundredHourFgColor] = useState('#ffffff');


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
      setTimeout(() => toast({ variant: 'destructive', title: 'Invalid Number', description: 'Please enter a positive number of days.' }), 0);
      return;
    }
    if (!expirySettingsRef) return;
    const currentPeriods = expirySettings?.warningPeriods || [];
    if (currentPeriods.some((p) => p.period === period)) {
      setTimeout(() => toast({ variant: 'destructive', title: 'Duplicate Period', description: `The warning period for ${period} days already exists.` }), 0);
      return;
    }
    const updatedWarningPeriods = [...currentPeriods, { period, color: newPeriodColor }].sort((a, b) => a.period - b.period);
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: updatedWarningPeriods }, { merge: true });
    setTimeout(() => toast({ title: 'Warning Period Added', description: `${period} days has been added.` }), 0);
    setNewPeriod('');
    setNewPeriodColor(defaultPeriodColor);
  };

  const handleRemovePeriod = (periodToRemove: number) => {
    if (!expirySettingsRef) return;
    const newPeriods = (expirySettings?.warningPeriods || []).filter((p) => p.period !== periodToRemove);
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });
    setTimeout(() => toast({ title: 'Warning Period Removed', description: `${periodToRemove} days has been removed.` }), 0);
  };
  
  const handleMilestoneWarningChange = (milestoneValue: number, warningHours: string) => {
    const hours = parseInt(warningHours, 10);
    if (!isNaN(hours)) {
        setMilestoneState(prev => prev.map(m => m.milestone === milestoneValue ? { ...m, warningHours: hours } : m));
    }
  }

  const handleAddInspectionWarning = (type: '50hr' | '100hr') => {
    if (!inspectionSettingsRef) return;
    
    const is50hr = type === '50hr';
    const hoursStr = is50hr ? newFiftyHour : newHundredHour;
    const newBgColor = is50hr ? newFiftyHourColor : newHundredHourColor;
    const newFgColor = is50hr ? newFiftyHourFgColor : newHundredHourFgColor;
    const hours = parseInt(hoursStr, 10);

    if (isNaN(hours) || hours <= 0) {
        setTimeout(() => toast({ variant: 'destructive', title: 'Invalid Number', description: 'Please enter a positive number of hours.' }), 0);
        return;
    }

    const fieldKey = is50hr ? 'fiftyHourWarnings' : 'oneHundredHourWarnings';
    const currentWarnings = (inspectionSettings as any)?.[fieldKey] || [];
    if (currentWarnings.some((w: any) => w.hours === hours)) {
        setTimeout(() => toast({ variant: 'destructive', title: 'Duplicate Warning', description: `A warning for ${hours} hours already exists.` }), 0);
        return;
    }

    const updatedWarnings = [...currentWarnings, { hours, color: newBgColor, foregroundColor: newFgColor }].sort((a, b) => b.hours - a.hours);
    setDocumentNonBlocking(inspectionSettingsRef, { [fieldKey]: updatedWarnings }, { merge: true });

    setTimeout(() => toast({ title: 'Inspection Warning Added' }), 0);

    if (is50hr) {
        setNewFiftyHour('');
        setNewFiftyHourColor('#facc15');
        setNewFiftyHourFgColor('#000000');
    } else {
        setNewHundredHour('');
        setNewHundredHourColor('#f97316');
        setNewHundredHourFgColor('#ffffff');
    }
  };

  const handleRemoveInspectionWarning = (type: '50hr' | '100hr', hoursToRemove: number) => {
    if (!inspectionSettingsRef) return;
    const fieldKey = type === '50hr' ? 'fiftyHourWarnings' : 'oneHundredHourWarnings';
    const newWarnings = ((inspectionSettings as any)?.[fieldKey] || []).filter((w: any) => w.hours !== hoursToRemove);
    setDocumentNonBlocking(inspectionSettingsRef, { [fieldKey]: newWarnings }, { merge: true });
    setTimeout(() => toast({ title: 'Inspection Warning Removed' }), 0);
  };


  const isLoading = isLoadingExpiry || isLoadingMilestones || isLoadingInspections;
  const error = expiryError || milestoneError || inspectionError;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 h-full">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive p-8">Error loading settings: {error.message}</p>;
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 p-4" />

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-10 pb-24">
              
              {/* --- Section 1: Documents & Milestones --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Document Expiry Warnings */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Document Expiry Warnings</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Default Safe Color</Label>
                      <div className='flex items-center gap-3 p-2 border rounded-lg bg-background'>
                        <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: defaultColorState }}>
                          <Input type="color" value={defaultColorState} onChange={(e) => setDefaultColorState(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                        </div>
                        <span className="text-[10px] font-medium truncate">Safe status</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Expired Color</Label>
                      <div className='flex items-center gap-3 p-2 border rounded-lg bg-background'>
                        <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: expiredColorState }}>
                          <Input type="color" value={expiredColorState} onChange={(e) => setExpiredColorState(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                        </div>
                        <span className="text-[10px] font-medium truncate">Expired status</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Warning Period</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} placeholder="Days..." className="h-9" onKeyDown={(e) => e.key === 'Enter' && handleAddPeriod()} />
                      <Input type="color" value={newPeriodColor} onChange={(e) => setNewPeriodColor(e.target.value)} className="p-1 h-9 w-12 shrink-0" />
                      <Button onClick={handleAddPeriod} size="sm" className="h-9 px-4">Add</Button>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-4">
                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Active Warning Periods</h4>
                    <div className="space-y-2">
                      {(expirySettings?.warningPeriods || []).length > 0 ? (
                        (expirySettings?.warningPeriods || []).map(({ period, color }) => (
                          <div key={period} className="flex items-center justify-between p-2 rounded-lg bg-background border shadow-sm group">
                            <div className="flex items-center gap-3">
                              <div className="relative h-5 w-5 rounded-full border" style={{ backgroundColor: periodColors[period] || color }}>
                                <Input type="color" value={periodColors[period] || color} onChange={(e) => setPeriodColors(prev => ({...prev, [period]: e.target.value}))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0" />
                              </div>
                              <span className="text-xs font-bold">{period} days before expiry</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePeriod(period)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center py-4 italic">No warning periods defined.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Hour Milestones */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Student Hour Milestones</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {milestoneState.map(({ milestone, warningHours }) => (
                      <div key={milestone} className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm">
                        <div>
                          <p className="text-sm font-bold">{milestone} Hour Goal</p>
                          <p className="text-[10px] text-muted-foreground">Primary training milestone</p>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-lg border">
                          <Label className="text-[10px] font-bold uppercase">Warn at:</Label>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              value={warningHours}
                              onChange={(e) => handleMilestoneWarningChange(milestone, e.target.value)}
                              className="w-16 h-7 text-xs font-bold text-center px-1"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">hrs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                    <p className="text-[10px] leading-relaxed text-blue-800">
                      <strong>Note:</strong> Warning hours determine when the milestone progress bar changes color in the student profile view to indicate a target is approaching.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* --- Section 2: Aircraft Inspection Warnings --- */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Aircraft Inspection Warnings</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 50 Hour Inspection */}
                  <div className="space-y-4 p-5 border rounded-2xl bg-muted/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-primary/10 rounded-bl-2xl">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-primary">50h Intervals</span>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Warning Threshold</Label>
                      <div className="flex gap-2">
                        <Input value={newFiftyHour} onChange={(e) => setNewFiftyHour(e.target.value)} placeholder="Hours remaining..." className="h-9 bg-background" />
                        <div className="flex gap-1 bg-background border rounded-md p-1 px-2">
                          <Label className="text-[8px] uppercase font-bold pt-2">BG</Label>
                          <Input type="color" value={newFiftyHourColor} onChange={(e) => setNewFiftyHourColor(e.target.value)} className="p-0 h-7 w-7 border-none" />
                          <Separator orientation="vertical" className="h-4 mt-1.5" />
                          <Label className="text-[8px] uppercase font-bold pt-2">FG</Label>
                          <Input type="color" value={newFiftyHourFgColor} onChange={(e) => setNewFiftyHourFgColor(e.target.value)} className="p-0 h-7 w-7 border-none" />
                        </div>
                        <Button onClick={() => handleAddInspectionWarning('50hr')} size="sm" className="h-9 px-4">Add</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {fiftyHourWarnings.length > 0 ? fiftyHourWarnings.map(({ hours, color, foregroundColor }) => (
                        <div key={hours} className="flex items-center justify-between p-3 rounded-xl bg-background border shadow-sm group">
                          <Badge style={{ backgroundColor: color, color: foregroundColor }} className="border-none font-black text-[10px] px-3 py-1">
                            {hours} HRS REMAINING
                          </Badge>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1.5">
                              <Input type="color" value={color} onChange={(e) => { const newWarnings = fiftyHourWarnings.map(w => w.hours === hours ? { ...w, color: e.target.value } : w); setDocumentNonBlocking(inspectionSettingsRef!, { fiftyHourWarnings: newWarnings }, { merge: true }); }} className="p-0 h-5 w-5 rounded-full border-none shadow-none" />
                              <Input type="color" value={foregroundColor} onChange={(e) => { const newWarnings = fiftyHourWarnings.map(w => w.hours === hours ? { ...w, foregroundColor: e.target.value } : w); setDocumentNonBlocking(inspectionSettingsRef!, { fiftyHourWarnings: newWarnings }, { merge: true }); }} className="p-0 h-5 w-5 rounded-full border-none shadow-none" />
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveInspectionWarning('50hr', hours)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          No thresholds defined
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 100 Hour Inspection */}
                  <div className="space-y-4 p-5 border rounded-2xl bg-muted/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-primary/10 rounded-bl-2xl">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-primary">100h Intervals</span>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Warning Threshold</Label>
                      <div className="flex gap-2">
                        <Input value={newHundredHour} onChange={(e) => setNewHundredHour(e.target.value)} placeholder="Hours remaining..." className="h-9 bg-background" />
                        <div className="flex gap-1 bg-background border rounded-md p-1 px-2">
                          <Label className="text-[8px] uppercase font-bold pt-2">BG</Label>
                          <Input type="color" value={newHundredHourColor} onChange={(e) => setNewHundredHourColor(e.target.value)} className="p-0 h-7 w-7 border-none" />
                          <Separator orientation="vertical" className="h-4 mt-1.5" />
                          <Label className="text-[8px] uppercase font-bold pt-2">FG</Label>
                          <Input type="color" value={newHundredHourFgColor} onChange={(e) => setNewHundredHourFgColor(e.target.value)} className="p-0 h-7 w-7 border-none" />
                        </div>
                        <Button onClick={() => handleAddInspectionWarning('100hr')} size="sm" className="h-9 px-4">Add</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {hundredHourWarnings.length > 0 ? hundredHourWarnings.map(({ hours, color, foregroundColor }) => (
                        <div key={hours} className="flex items-center justify-between p-3 rounded-xl bg-background border shadow-sm group">
                          <Badge style={{ backgroundColor: color, color: foregroundColor }} className="border-none font-black text-[10px] px-3 py-1">
                            {hours} HRS REMAINING
                          </Badge>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1.5">
                              <Input type="color" value={color} onChange={(e) => { const newWarnings = hundredHourWarnings.map(w => w.hours === hours ? { ...w, color: e.target.value } : w); setDocumentNonBlocking(inspectionSettingsRef!, { oneHundredHourWarnings: newWarnings }, { merge: true }); }} className="p-0 h-5 w-5 rounded-full border-none shadow-none" />
                              <Input type="color" value={foregroundColor} onChange={(e) => { const newWarnings = hundredHourWarnings.map(w => w.hours === hours ? { ...w, foregroundColor: e.target.value } : w); setDocumentNonBlocking(inspectionSettingsRef!, { oneHundredHourWarnings: newWarnings }, { merge: true }); }} className="p-0 h-5 w-5 rounded-full border-none shadow-none" />
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveInspectionWarning('100hr', hours)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          No thresholds defined
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
