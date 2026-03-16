
'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { RiskMatrixSettings } from '@/types/risk';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Pencil, Check } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { Skeleton } from '@/components/ui/skeleton';

const defaultLikelihoods = [
    { name: 'Frequent', description: 'Likely to occur many times (has happened frequently).', value: 5 },
    { name: 'Occasional', description: 'Likely to occur some times (has happened infrequently).', value: 4 },
    { name: 'Remote', description: 'Unlikely, but possible to occur (has happened rarely).', value: 3 },
    { name: 'Improbable', description: 'Very unlikely to occur (not known to have happened).', value: 2 },
    { name: 'Extremely Improbable', description: 'Almost inconceivable that the event will occur.', value: 1 },
];

const defaultSeverities = [
    { name: 'Catastrophic', description: 'Equipment destroyed, multiple deaths.', value: 'A' },
    { name: 'Hazardous', description: 'Large reduction in safety margins, serious injury, major equipment damage.', value: 'B' },
    { name: 'Major', description: 'Significant reduction in safety margins, serious incident, injury to persons.', value: 'C' },
    { name: 'Minor', description: 'Nuisance, operating limitations, minor incident.', value: 'D' },
    { name: 'Negligible', description: 'Little or no effect on safety.', value: 'E' },
];

const defaultColors: Record<string, string> = {
    '5A': '#ef4444', '5B': '#ef4444', '5C': '#f59e0b', '5D': '#f59e0b', '5E': '#f59e0b',
    '4A': '#ef4444', '4B': '#ef4444', '4C': '#ef4444', '4D': '#10b981', '4E': '#10b981',
    '3A': '#ef4444', '3B': '#ef4444', '3C': '#f59e0b', '3D': '#10b981', '3E': '#10b981',
    '2A': '#f59e0b', '2B': '#f59e0b', '2C': '#10b981', '2D': '#10b981', '2E': '#10b981',
    '1A': '#f59e0b', '1B': '#10b981', '1C': '#10b981', '1D': '#10b981', '1E': '#10b981',
};

export default function RiskMatrixPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const settingsId = 'risk-matrix-config';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canManage = hasPermission('risk-matrix-manage-definitions');

  const settingsRef = useMemoFirebase(() => (
    firestore ? doc(firestore, 'tenants', tenantId, 'settings', settingsId) : null
  ), [firestore, tenantId]);

  const { data: riskMatrixSettings, isLoading } = useDoc<RiskMatrixSettings>(settingsRef);

  const [colors, setColors] = useState<Record<string, string>>(defaultColors);
  const [likelihoods, setLikelihoods] = useState(defaultLikelihoods);
  const [severities, setSeverities] = useState(defaultSeverities);
  
  const [isEditingSeverity, setIsEditingSeverity] = useState(false);
  const [isEditingLikelihood, setIsEditingLikelihood] = useState(false);
  
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  useEffect(() => {
    if (riskMatrixSettings) {
        if (riskMatrixSettings.colors) setColors(riskMatrixSettings.colors);
        if (riskMatrixSettings.likelihoodDefinitions) setLikelihoods(riskMatrixSettings.likelihoodDefinitions);
        if (riskMatrixSettings.severityDefinitions) setSeverities(riskMatrixSettings.severityDefinitions);
    } else if (!isLoading && settingsRef) {
        setDocumentNonBlocking(settingsRef, { 
            id: settingsId, 
            colors: defaultColors,
            likelihoodDefinitions: defaultLikelihoods,
            severityDefinitions: defaultSeverities
        }, { merge: false });
    }
  }, [riskMatrixSettings, isLoading, settingsRef]);

  const queueSave = (updates: Partial<RiskMatrixSettings>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        if (settingsRef) {
            setDocumentNonBlocking(settingsRef, updates, { merge: true });
        }
    }, 1000);
  };

  const handleColorChange = (cellId: string, newColor: string) => {
    const newColors = { ...colors, [cellId]: newColor };
    setColors(newColors);
    queueSave({ colors: newColors });
  };

  const handleLikelihoodChange = (index: number, field: 'name' | 'description', value: string) => {
      const newLikelihoods = [...likelihoods];
      newLikelihoods[index] = { ...newLikelihoods[index], [field]: value };
      setLikelihoods(newLikelihoods);
      queueSave({ likelihoodDefinitions: newLikelihoods });
  };

  const handleSeverityChange = (index: number, field: 'name' | 'description', value: string) => {
      const newSeverities = [...severities];
      newSeverities[index] = { ...newSeverities[index], [field]: value };
      setSeverities(newSeverities);
      queueSave({ severityDefinitions: newSeverities });
  };

  const handleRightClick = (e: React.MouseEvent, cellId: string) => {
      e.preventDefault();
      if (!canManage) return;
      setActiveCell(cellId);
      if (colorInputRef.current) {
          colorInputRef.current.click();
      }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full px-1">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 px-1">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5">
          <CardTitle>Risk Matrix Configuration</CardTitle>
          <CardDescription>
            This matrix determines the level of risk for identified hazards. {canManage ? 'Right-click a cell to customize colors.' : ''}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full custom-scrollbar">
            <div className="p-6 space-y-10 pb-24">
              
              <div className="overflow-x-auto border rounded-xl overflow-hidden shadow-sm bg-card w-fit mx-auto">
                <table className="table-fixed border-separate" style={{ borderSpacing: 0 }}>
                    <thead>
                        <tr className="h-14">
                            <th className="w-32 border-b border-r border-slate-200 dark:border-slate-700 bg-muted/30"></th>
                            {severities.map(s => (
                                <th key={s.value} className="w-24 border-r border-b border-slate-200 dark:border-slate-700 p-1 text-center align-middle font-bold text-[9px] uppercase tracking-wider bg-muted/30">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span>{s.name}</span>
                                        <span className="text-primary">({s.value})</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {likelihoods.map(l => (
                            <tr key={l.value} className="h-16">
                                <th className="border-r border-b border-slate-200 dark:border-slate-700 p-1 text-right align-middle font-bold text-[9px] uppercase tracking-wider bg-muted/10">
                                    {l.name}
                                    <span className="block text-[8px] text-muted-foreground font-normal">({l.value})</span>
                                </th>
                                {severities.map(s => {
                                    const cellId = `${l.value}${s.value}`;
                                    return (
                                    <td
                                        key={cellId}
                                        onContextMenu={(e) => handleRightClick(e, cellId)}
                                        style={{ backgroundColor: colors[cellId] }}
                                        className={cn(
                                            "border-b border-r border-slate-200 dark:border-slate-700 p-1 text-center align-middle font-black text-[10px] text-black transition-all",
                                            canManage && "cursor-pointer hover:scale-[0.98] active:scale-95"
                                        )}
                                    >
                                        {cellId}
                                    </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Input 
                    type="color" 
                    ref={colorInputRef} 
                    className="hidden" 
                    onChange={(e) => activeCell && handleColorChange(activeCell, e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <Card className="shadow-none border flex flex-col overflow-hidden">
                  <CardHeader className="py-3 border-b bg-muted/5 shrink-0 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] uppercase font-black tracking-widest text-primary">Severity Definitions</CardTitle>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingSeverity(!isEditingSeverity)}
                        >
                            {isEditingSeverity ? <><Check className="mr-1 h-3 w-3" /> Done</> : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
                        </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {severities.map((s, index) => (
                        <div key={s.value} className="p-3 bg-background rounded-lg border border-border shadow-sm space-y-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{s.value}</Badge>
                                {isEditingSeverity ? (
                                    <Input 
                                        value={s.name} 
                                        onChange={(e) => handleSeverityChange(index, 'name', e.target.value)}
                                        className="h-8 text-xs font-bold bg-muted/10 border-none shadow-none focus-visible:ring-1"
                                        placeholder="Name"
                                    />
                                ) : (
                                    <span className="text-xs font-bold">{s.name}</span>
                                )}
                            </div>
                            {isEditingSeverity ? (
                                <Textarea 
                                    value={s.description} 
                                    onChange={(e) => handleSeverityChange(index, 'description', e.target.value)}
                                    className="text-xs min-h-[60px] py-2 bg-muted/5 border-none shadow-none focus-visible:ring-1"
                                    placeholder="Description"
                                />
                            ) : (
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                            )}
                        </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-none border flex flex-col overflow-hidden">
                  <CardHeader className="py-3 border-b bg-muted/5 shrink-0 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] uppercase font-black tracking-widest text-primary">Likelihood Definitions</CardTitle>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingLikelihood(!isEditingLikelihood)}
                        >
                            {isEditingLikelihood ? <><Check className="mr-1 h-3 w-3" /> Done</> : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
                        </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {likelihoods.map((l, index) => (
                        <div key={l.value} className="p-3 bg-background rounded-lg border border-border shadow-sm space-y-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{l.value}</Badge>
                                {isEditingLikelihood ? (
                                    <Input 
                                        value={l.name} 
                                        onChange={(e) => handleLikelihoodChange(index, 'name', e.target.value)}
                                        className="h-8 text-xs font-bold bg-muted/10 border-none shadow-none focus-visible:ring-1"
                                        placeholder="Name"
                                    />
                                ) : (
                                    <span className="text-xs font-bold">{l.name}</span>
                                )}
                            </div>
                            {isEditingLikelihood ? (
                                <Textarea 
                                    value={l.description} 
                                    onChange={(e) => handleLikelihoodChange(index, 'description', e.target.value)}
                                    className="text-xs min-h-[60px] py-2 bg-muted/5 border-none shadow-none focus-visible:ring-1"
                                    placeholder="Description"
                                />
                            ) : (
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{l.description}</p>
                            )}
                        </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
