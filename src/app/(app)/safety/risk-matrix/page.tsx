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
import { Button } from '@/components/ui/button';
import { Pencil, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

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
      <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1 overflow-hidden">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 px-1 pb-4">
      {/* --- CONSOLIDATED STICKY HEADER CARD --- */}
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-headline">Risk Matrix Configuration</CardTitle>
              <CardDescription className="max-w-2xl">
                This matrix determines the level of risk for identified hazards based on standard ICAO taxonomy. 
                {canManage && <span className="block mt-1 text-primary font-medium">Right-click a cell to customize colors.</span>}
              </CardDescription>
            </div>
            <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Export PDF
                </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-10 pb-24">
              
              {/* --- THE MATRIX --- */}
              <div className="flex flex-col items-center">
                <div className="inline-block overflow-x-auto border rounded-2xl overflow-hidden shadow-md bg-card mx-auto max-w-full">
                    <table className="table-fixed border-separate" style={{ borderSpacing: 0 }}>
                        <thead>
                            <tr className="h-20">
                                <th className="w-32 border-b border-r border-slate-200 dark:border-slate-700 bg-muted/30"></th>
                                {severities.map(s => (
                                    <th key={s.value} className="w-28 border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center align-middle font-bold text-[10px] uppercase tracking-wider bg-muted/30">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="truncate w-full">{s.name}</span>
                                            <span className="text-primary font-black text-xs">({s.value})</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {likelihoods.map(l => (
                                <tr key={l.value} className="h-20">
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-right align-middle font-bold text-[10px] uppercase tracking-wider bg-muted/10 leading-tight">
                                        {l.name}
                                        <span className="block text-[9px] text-muted-foreground font-black mt-1">({l.value})</span>
                                    </th>
                                    {severities.map(s => {
                                        const cellId = `${l.value}${s.value}`;
                                        return (
                                        <td
                                            key={cellId}
                                            onContextMenu={(e) => handleRightClick(e, cellId)}
                                            style={{ backgroundColor: colors[cellId] }}
                                            className={cn(
                                                "border-b border-r border-slate-200 dark:border-slate-700 p-1 text-center align-middle font-black text-sm text-black transition-all",
                                                canManage && "cursor-pointer hover:brightness-90 active:scale-95"
                                            )}
                                        >
                                            <span className="drop-shadow-sm">{cellId}</span>
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
              </div>

              <Separator />

              {/* --- DEFINITIONS SECTION --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Severity Definitions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Severity Definitions
                    </h3>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-3 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingSeverity(!isEditingSeverity)}
                        >
                            {isEditingSeverity ? <><Check className="mr-1 h-3 w-3" /> Save</> : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
                        </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {severities.map((s, index) => (
                        <div key={s.value} className="p-4 bg-background rounded-xl border border-border shadow-sm flex flex-col gap-3 group transition-all hover:border-primary/30">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-primary text-primary">{s.value}</Badge>
                                {isEditingSeverity ? (
                                    <Input 
                                        value={s.name} 
                                        onChange={(e) => handleSeverityChange(index, 'name', e.target.value)}
                                        className="h-8 text-xs font-bold bg-muted/5 uppercase"
                                        placeholder="Category Name"
                                    />
                                ) : (
                                    <span className="text-xs font-black uppercase tracking-tight">{s.name}</span>
                                )}
                            </div>
                            {isEditingSeverity ? (
                                <Textarea 
                                    value={s.description} 
                                    onChange={(e) => handleSeverityChange(index, 'description', e.target.value)}
                                    className="text-xs min-h-[80px] py-2 bg-muted/5 resize-none"
                                    placeholder="Impact description..."
                                />
                            ) : (
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium pl-11">{s.description}</p>
                            )}
                        </div>
                    ))}
                  </div>
                </div>

                {/* Likelihood Definitions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Likelihood Definitions
                    </h3>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-3 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingLikelihood(!isEditingLikelihood)}
                        >
                            {isEditingLikelihood ? <><Check className="mr-1 h-3 w-3" /> Save</> : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
                        </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {likelihoods.map((l, index) => (
                        <div key={l.value} className="p-4 bg-background rounded-xl border border-border shadow-sm flex flex-col gap-3 group transition-all hover:border-primary/30">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-primary text-primary">{l.value}</Badge>
                                {isEditingLikelihood ? (
                                    <Input 
                                        value={l.name} 
                                        onChange={(e) => handleLikelihoodChange(index, 'name', e.target.value)}
                                        className="h-8 text-xs font-bold bg-muted/5 uppercase"
                                        placeholder="Category Name"
                                    />
                                ) : (
                                    <span className="text-xs font-black uppercase tracking-tight">{l.name}</span>
                                )}
                            </div>
                            {isEditingLikelihood ? (
                                <Textarea 
                                    value={l.description} 
                                    onChange={(e) => handleLikelihoodChange(index, 'description', e.target.value)}
                                    className="text-xs min-h-[80px] py-2 bg-muted/5 resize-none"
                                    placeholder="Probability description..."
                                />
                            ) : (
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium pl-11">{l.description}</p>
                            )}
                        </div>
                    ))}
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
