
'use client';

import { useState } from 'react';
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

export type WarningPeriod = {
  period: number;
  color: string;
};

export type DocumentExpirySettings = {
  id: string;
  warningPeriods: WarningPeriod[];
};

const defaultColor = '#facc15'; // yellow-400

export default function DocumentDatesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const settingsId = 'document-expiry';

  const [newPeriod, setNewPeriod] = useState('');
  const [newColor, setNewColor] = useState(defaultColor);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', settingsId) : null),
    [firestore, tenantId]
  );

  const { data: expirySettings, isLoading, error } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const handleAddPeriod = () => {
    const period = parseInt(newPeriod, 10);
    if (isNaN(period) || period <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Please enter a positive number of days.',
      });
      return;
    }

    if (!expirySettingsRef) return;

    const currentPeriods = expirySettings?.warningPeriods || [];
    if (currentPeriods.some((p) => p.period === period)) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Period',
        description: `The warning period for ${period} days already exists.`,
      });
      return;
    }

    const newWarningPeriod: WarningPeriod = { period, color: newColor };
    const newPeriods = [...currentPeriods, newWarningPeriod].sort((a, b) => a.period - b.period);
    
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });

    toast({
      title: 'Warning Period Added',
      description: `${period} days has been added to the warning periods.`,
    });
    setNewPeriod('');
    setNewColor(defaultColor);
  };

  const handleRemovePeriod = (periodToRemove: number) => {
    if (!expirySettingsRef) return;

    const currentPeriods = expirySettings?.warningPeriods || [];
    const newPeriods = currentPeriods.filter((p) => p.period !== periodToRemove);
    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });

    toast({
      title: 'Warning Period Removed',
      description: `${periodToRemove} days has been removed.`,
    });
  };

  const handleColorChange = (periodToUpdate: number, newColor: string) => {
    if (!expirySettingsRef) return;
    
    const currentPeriods = expirySettings?.warningPeriods || [];
    const newPeriods = currentPeriods.map(p => 
        p.period === periodToUpdate ? { ...p, color: newColor } : p
    );

    setDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods }, { merge: true });
    
    toast({
        title: 'Color Updated',
        description: `The color for the ${periodToUpdate}-day warning has been updated.`,
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading settings: {error.message}</p>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Document Expiry Warnings</CardTitle>
        <CardDescription>
          Configure automatic warnings for documents that are approaching their expiration date.
          Notifications will be triggered based on these periods and their assigned colors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="warning-period">New Warning Period</Label>
          <div className="flex gap-2">
            <Input
              id="warning-period"
              type="number"
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              placeholder="e.g., 30 (days)"
              className="w-48"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPeriod()}
            />
             <Input
              id="warning-color"
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="p-1 h-10 w-12"
            />
            <Button onClick={handleAddPeriod} className="flex-grow">Add Period</Button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Current Warning Periods
          </h4>
          <div className="flex flex-col gap-2 p-4 border rounded-lg min-h-16">
            {(expirySettings?.warningPeriods || []).length > 0 ? (
              expirySettings?.warningPeriods.map(({ period, color }) => (
                <div key={period} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                    <div className="flex items-center gap-3">
                        <div className="relative h-6 w-6 rounded-full border cursor-pointer" style={{ backgroundColor: color }}>
                           <Input 
                                type="color" 
                                value={color}
                                onChange={(e) => handleColorChange(period, e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0"
                            />
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-2 text-base py-1">
                            {period} days
                        </Badge>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-destructive/20"
                        onClick={() => handleRemovePeriod(period)}
                    >
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
  );
}
