
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export type DocumentExpirySettings = {
  id: string;
  warningPeriods: number[]; // Array of days (e.g., [30, 60, 90])
};

export default function DocumentDatesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const settingsId = 'document-expiry';

  const [newPeriod, setNewPeriod] = useState('');

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
    if (currentPeriods.includes(period)) {
        toast({
            variant: 'destructive',
            title: 'Duplicate Period',
            description: `The warning period for ${period} days already exists.`,
        });
        return;
    }

    const newPeriods = [...currentPeriods, period].sort((a, b) => a - b);
    updateDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods });

    toast({
      title: 'Warning Period Added',
      description: `${period} days has been added to the warning periods.`,
    });
    setNewPeriod('');
  };

  const handleRemovePeriod = (periodToRemove: number) => {
    if (!expirySettingsRef) return;

    const currentPeriods = expirySettings?.warningPeriods || [];
    const newPeriods = currentPeriods.filter((p) => p !== periodToRemove);
    updateDocumentNonBlocking(expirySettingsRef, { warningPeriods: newPeriods });

     toast({
      title: 'Warning Period Removed',
      description: `${periodToRemove} days has been removed.`,
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
    return <p className="text-destructive">Error loading settings: {error.message}</p>
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Document Expiry Warnings</CardTitle>
        <CardDescription>
          Configure automatic warnings for documents that are approaching their expiration date.
          Notifications will be triggered based on these periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="warning-period">New Warning Period (in days)</Label>
          <div className="flex gap-2">
            <Input
              id="warning-period"
              type="number"
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              placeholder="e.g., 30"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPeriod()}
            />
            <Button onClick={handleAddPeriod}>Add Period</Button>
          </div>
        </div>

        <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Current Warning Periods
            </h4>
            <div className="flex flex-wrap gap-2 p-4 border rounded-lg min-h-16">
                {(expirySettings?.warningPeriods || []).length > 0 ? (
                    expirySettings?.warningPeriods.map((period) => (
                        <Badge key={period} variant="secondary" className="flex items-center gap-2 text-base py-1">
                            {period} days
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 rounded-full hover:bg-destructive/20"
                                onClick={() => handleRemovePeriod(period)}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                                <span className="sr-only">Remove {period} days</span>
                            </Button>
                        </Badge>
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
