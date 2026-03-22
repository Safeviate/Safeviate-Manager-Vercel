'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AlertTriangle, Clock, Phone } from 'lucide-react';

export type OverdueMonitorSettings = {
  id: string;
  isEnabled: boolean;
  thresholdMinutes: number;
  contactPhone: string;
};

const defaultSettings: OverdueMonitorSettings = {
  id: 'overdue-monitor',
  isEnabled: true,
  thresholdMinutes: 5,
  contactPhone: '555-0199',
};

export default function OverdueSettingsPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'overdue-monitor') : null),
    [firestore, tenantId]
  );

  const { data: settings, isLoading } = useDoc<OverdueMonitorSettings>(settingsRef);

  const [isEnabled, setIsEnabled] = useState(defaultSettings.isEnabled);
  const [thresholdMinutes, setThresholdMinutes] = useState(defaultSettings.thresholdMinutes);
  const [contactPhone, setContactPhone] = useState(defaultSettings.contactPhone);

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled);
      setThresholdMinutes(settings.thresholdMinutes);
      setContactPhone(settings.contactPhone);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settingsRef) return;

    setDocumentNonBlocking(settingsRef, {
      id: 'overdue-monitor',
      isEnabled,
      thresholdMinutes: Number(thresholdMinutes),
      contactPhone,
    }, { merge: true });

    toast({
      title: 'Settings Saved',
      description: 'The overdue aircraft monitor has been updated.',
    });
  };

  if (isLoading) {
    return <div className="max-w-2xl mx-auto space-y-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-1">
      <Card className="shadow-none border border-amber-900/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-1">
            <AlertTriangle className="h-6 w-6 text-emerald-800" />
            <CardTitle className="text-2xl font-bold tracking-tight">Overdue Aircraft Monitor</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground font-medium leading-relaxed max-w-lg">
            Configure the safety alert that triggers when an aircraft fails to land within its scheduled window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          <div className="flex items-center justify-between space-x-4 rounded-xl border border-primary/10 p-5 bg-primary/5">
            <div className="space-y-1">
              <Label htmlFor="monitor-toggle" className="text-sm font-bold text-foreground">Enable Safety Monitor</Label>
              <p className="text-[10px] text-muted-foreground font-medium">
                Activate the global alert for flights past their end time.
              </p>
            </div>
            <Switch
              id="monitor-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Alert Threshold (Minutes)
              </Label>
              <Input
                type="number"
                value={thresholdMinutes}
                onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                placeholder="e.g., 5"
                className="h-11 bg-background"
              />
              <p className="text-[10px] text-muted-foreground font-medium italic">
                The number of minutes to wait after the scheduled end time before showing the alert.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Operations Fallback Number
              </Label>
              <Input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g., 555-0199"
                className="h-11 bg-background"
              />
              <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                This number is displayed only if no specific contact numbers are found in the instructor or student profiles.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 px-8 shadow-sm">
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
