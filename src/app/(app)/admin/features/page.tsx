
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

export type FeatureSettings = {
  id: string;
  preFlightChecklistRequired: boolean;
};

export type FindingLevel = {
  id: string;
  name: string;
  color: string;
  foregroundColor: string;
};

export type FindingLevelsSettings = {
  id: string;
  levels: FindingLevel[];
};

const defaultFindingLevels: FindingLevel[] = [
    { id: 'obs', name: 'Observation', color: '#3b82f6', foregroundColor: '#ffffff' },
    { id: 'lvl1', name: 'Level 1', color: '#facc15', foregroundColor: '#000000' },
    { id: 'lvl2', name: 'Level 2', color: '#f97316', foregroundColor: '#ffffff' },
    { id: 'lvl3', name: 'Level 3', color: '#ef4444', foregroundColor: '#ffffff' },
];

export default function FeaturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  
  // --- Feature Management State & Logic ---
  const featureSettingsId = 'features';
  const featureSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', featureSettingsId) : null),
    [firestore, tenantId]
  );
  const { data: featureSettings, isLoading: isLoadingFeatures } = useDoc<FeatureSettings>(featureSettingsRef, {
    initialData: { id: featureSettingsId, preFlightChecklistRequired: true },
  });

  // --- Finding Levels State & Logic ---
  const findingLevelsId = 'finding-levels';
  const findingLevelsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', findingLevelsId) : null),
    [firestore, tenantId]
  );
  const { data: findingLevelsSettings, isLoading: isLoadingFindingLevels } = useDoc<FindingLevelsSettings>(findingLevelsRef);
  
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelColor, setNewLevelColor] = useState('#808080');
  const [newLevelForegroundColor, setNewLevelForegroundColor] = useState('#ffffff');
  const [levelColors, setLevelColors] = useState<Record<string, { bg: string, fg: string }>>({});
  
  const debouncedLevelColors = useDebounce(levelColors, 500);

  useEffect(() => {
    if (findingLevelsSettings?.levels) {
        const initialColors = (findingLevelsSettings.levels).reduce((acc, l) => {
            acc[l.id] = { bg: l.color, fg: l.foregroundColor || '#ffffff' };
            return acc;
        }, {} as Record<string, { bg: string, fg: string }>);
        setLevelColors(initialColors);
    }
  }, [findingLevelsSettings]);

  useEffect(() => {
      if (!findingLevelsRef || !findingLevelsSettings?.levels || Object.keys(debouncedLevelColors).length === 0 || isLoadingFindingLevels) return;

      const hasChanged = findingLevelsSettings.levels.some(l => 
        (l.color !== debouncedLevelColors[l.id]?.bg && debouncedLevelColors[l.id]?.bg) ||
        (l.foregroundColor !== debouncedLevelColors[l.id]?.fg && debouncedLevelColors[l.id]?.fg)
      );

      if (hasChanged) {
        const newLevels = findingLevelsSettings.levels.map(l => ({
            ...l,
            color: debouncedLevelColors[l.id]?.bg || l.color,
            foregroundColor: debouncedLevelColors[l.id]?.fg || l.foregroundColor
        }));
        setDocumentNonBlocking(findingLevelsRef, { levels: newLevels }, { merge: true });
      }
  }, [debouncedLevelColors, findingLevelsSettings, findingLevelsRef, isLoadingFindingLevels]);

  const handleToggleChange = (feature: keyof Omit<FeatureSettings, 'id'>, value: boolean) => {
    if (!featureSettingsRef) return;
    setDocumentNonBlocking(featureSettingsRef, { [feature]: value }, { merge: true });
  };
  
  const handleAddLevel = () => {
    if (!newLevelName.trim()) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Please enter a name for the finding level.' });
      return;
    }
    if (!findingLevelsRef) return;

    const currentLevels = findingLevelsSettings?.levels || defaultFindingLevels;
    if (currentLevels.some(l => l.name.toLowerCase() === newLevelName.trim().toLowerCase())) {
       toast({ variant: 'destructive', title: 'Duplicate Level', description: `A finding level named "${newLevelName}" already exists.` });
       return;
    }

    const newLevel: FindingLevel = {
        id: newLevelName.trim().toLowerCase().replace(/\s+/g, '-'),
        name: newLevelName.trim(),
        color: newLevelColor,
        foregroundColor: newLevelForegroundColor,
    };

    const updatedLevels = [...currentLevels, newLevel];
    setDocumentNonBlocking(findingLevelsRef, { levels: updatedLevels }, { merge: true });
    toast({ title: 'Finding Level Added', description: `Level "${newLevel.name}" has been added.` });
    setNewLevelName('');
    setNewLevelColor('#808080');
    setNewLevelForegroundColor('#ffffff');
  }

  const handleRemoveLevel = (levelIdToRemove: string) => {
    if (!findingLevelsRef) return;
    const currentLevels = findingLevelsSettings?.levels || defaultFindingLevels;
    const updatedLevels = currentLevels.filter(l => l.id !== levelIdToRemove);
    setDocumentNonBlocking(findingLevelsRef, { levels: updatedLevels }, { merge: true });
    toast({ title: 'Finding Level Removed' });
  };

  const handleLevelColorChange = (levelId: string, type: 'bg' | 'fg', color: string) => {
    setLevelColors(prev => ({...prev, [levelId]: { ...prev[levelId], [type]: color }}));
  }
  
  const isLoading = isLoadingFeatures || isLoadingFindingLevels;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>
            Enable or disable specific application features and workflows for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFeatures ? (
            <Skeleton className="h-12 w-full" />
          ) : (
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
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Audit Finding Levels</CardTitle>
          <CardDescription>
            Define the names and colors for audit finding classifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {isLoadingFindingLevels ? (
              <Skeleton className="h-32 w-full" />
           ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-level-name">New Finding Level</Label>
                <div className="flex gap-2">
                    <Input
                        id="new-level-name"
                        value={newLevelName}
                        onChange={(e) => setNewLevelName(e.target.value)}
                        placeholder="e.g., Observation, Level 1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
                    />
                    <div className="flex items-center gap-1 border rounded-md px-2">
                      <Label htmlFor="new-level-color" className="text-xs">BG</Label>
                      <Input id="new-level-color" type="color" value={newLevelColor} onChange={(e) => setNewLevelColor(e.target.value)} className="p-0 h-8 w-8 border-none"/>
                    </div>
                     <div className="flex items-center gap-1 border rounded-md px-2">
                      <Label htmlFor="new-level-fg-color" className="text-xs">FG</Label>
                      <Input id="new-level-fg-color" type="color" value={newLevelForegroundColor} onChange={(e) => setNewLevelForegroundColor(e.target.value)} className="p-0 h-8 w-8 border-none"/>
                    </div>
                    <Button onClick={handleAddLevel}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                    Current Levels
                </h4>
                <div className="flex flex-col gap-2 p-4 border rounded-lg min-h-16">
                    {(findingLevelsSettings?.levels || defaultFindingLevels).length > 0 ? (
                        (findingLevelsSettings?.levels || defaultFindingLevels).map((level) => (
                            <div key={level.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                                <Badge style={{ 
                                    backgroundColor: levelColors[level.id]?.bg || level.color, 
                                    color: levelColors[level.id]?.fg || level.foregroundColor 
                                  }} className="text-base py-1">
                                    {level.name}
                                </Badge>
                                <div className="flex items-center gap-2">
                                     <div className="relative h-8 w-8 rounded-full border cursor-pointer" style={{ backgroundColor: levelColors[level.id]?.bg || level.color }}>
                                        <Input
                                            type="color"
                                            value={levelColors[level.id]?.bg || level.color}
                                            onChange={(e) => handleLevelColorChange(level.id, 'bg', e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0"
                                        />
                                    </div>
                                    <div className="relative h-8 w-8 rounded-full border cursor-pointer" style={{ backgroundColor: levelColors[level.id]?.fg || level.foregroundColor }}>
                                        <Input
                                            type="color"
                                            value={levelColors[level.id]?.fg || level.foregroundColor}
                                            onChange={(e) => handleLevelColorChange(level.id, 'fg', e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0"
                                        />
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full hover:bg-destructive/20"
                                        onClick={() => handleRemoveLevel(level.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Remove {level.name}</span>
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground w-full text-center">No finding levels configured.</p>
                    )}
                </div>
              </div>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
