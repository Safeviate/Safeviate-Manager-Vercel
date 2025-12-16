
'use client';

import { useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

export type FeatureSettings = {
  id: string;
  preFlightChecklistRequired: boolean;
};

export default function FeaturesPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const settingsId = 'features';

  const featureSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', settingsId) : null),
    [firestore, tenantId]
  );

  const { data: featureSettings, isLoading, error } = useDoc<FeatureSettings>(featureSettingsRef, {
    // Provide default values if the document doesn't exist
    initialData: { id: settingsId, preFlightChecklistRequired: true },
  });

  const handleToggleChange = (feature: keyof Omit<FeatureSettings, 'id'>, value: boolean) => {
    if (!featureSettingsRef) return;
    
    setDocumentNonBlocking(featureSettingsRef, { [feature]: value }, { merge: true });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading feature settings: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Management</CardTitle>
        <CardDescription>
          Enable or disable specific application features and workflows for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className='space-y-0.5'>
            <Label htmlFor="checklist-required" className="text-base">
              Enforce Checklist Completion
            </Label>
            <p className='text-sm text-muted-foreground'>
              If enabled, a pre-flight check must be completed before the next booking for an aircraft can be actioned.
            </p>
          </div>
          <Switch
            id="checklist-required"
            checked={featureSettings?.preFlightChecklistRequired ?? true}
            onCheckedChange={(value) => handleToggleChange('preFlightChecklistRequired', value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}


    