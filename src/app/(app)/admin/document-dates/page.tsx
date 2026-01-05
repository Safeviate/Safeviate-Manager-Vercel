
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
    // Simple deep equal check
    if (JSON.stringify(debouncedMilestoneState) !== JSON.stringify(milestoneSettings?.milestones)) {
        setDocumentNonBlocking(milestoneSettingsRef, { milestones: debouncedMilestoneState }, { merge: true });
    }
  }, [debouncedMilestoneState, milestoneSettingsRef, milestoneSettings, isLoadingMilestones]);


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

  const isLoading = isLoadingExpiry || isLoadingMilestones;
  const error = expiryError || milestoneError;

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
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
    </div>
  );
}
