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
import { Pencil, Check, AlertTriangle, ShieldCheck, Printer, LayoutGrid } from 'lucide-react';
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

  const handleCellInteraction = (cellId: string) => {
      if (!canManage) return;
      setActiveCell(cellId);
      if (colorInputRef.current) {
          colorInputRef.current.click();
      }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 px-1 pb-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 px-1 pb-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl font-headline">Risk Matrix Configuration</CardTitle>
            </div>
            <CardDescription className="max-w-2xl">
              Defining the organizational risk tolerance using ICAO taxonomy. 
              {canManage && <span className="block mt-1 text-primary font-medium">Click a cell to customize its visual classification.</span>}
            </CardDescription>
          </div>
          
          <div className="flex flex-col gap-1.5 xl:items-end w-full sm:w-auto">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Reporting Tools</p>
            <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-4 text-xs font-bold gap-2">
                    <Printer className="h-4 w-4" />
                    Export PDF
                </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-12 pb-24">
              
              {/* --- MODERN GRID MATRIX --- */}
              <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[700px] p-1">
                    <div className="grid grid-cols-[140px_repeat(5,1fr)] gap-2">
                        {/* Header Row */}
                        <div />
                        {severities.map(s => (
                            <div key={s.value} className="flex flex-col items-center justify-center p-3 bg-muted/20 rounded-xl border border-border/50 text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{s.name}</span>
                                <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-black text-xs border-primary text-primary">
                                    {s.value}
                                </Badge>
                            </div>
                        ))}

                        {/* Data Rows */}
                        {likelihoods.map(l => (
                            <React.Fragment key={l.value}>
                                {/* Row Header */}
                                <div className="flex items-center justify-end pr-4 text-right">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{l.name}</p>
                                        <p className="text-[10px] font-mono font-bold text-muted-foreground">({l.value})</p>
                                    </div>
                                </div>
                                {/* Cells */}
                                {severities.map(s => {
                                    const cellId = `${l.value}${s.value}`;
                                    const color = colors[cellId];
                                    
                                    return (
                                        <button
                                            key={cellId}
                                            onClick={() => handleCellInteraction(cellId)}
                                            style={{ backgroundColor: color }}
                                            className={cn(
                                                "h-16 rounded-xl shadow-sm flex items-center justify-center font-black text-lg text-black transition-all border-2 border-white/10",
                                                canManage ? "hover:scale-[1.02] hover:shadow-md cursor-pointer active:scale-95" : "cursor-default"
                                            )}
                                        >
                                            <span className="drop-shadow-sm opacity-80">{cellId}</span>
                                        </button>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <Input 
                    type="color" 
                    ref={colorInputRef} 
                    className="hidden" 
                    onChange={(e) => activeCell && handleColorChange(activeCell, e.target.value)}
                />
              </div>

              <Separator />

              {/* --- DEFINITIONS SECTION --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                
                {/* Severity Definitions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Severity Scale (Impact)
                    </h3>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-3 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingSeverity(!isEditingSeverity)}
                        >
                            {isEditingSeverity ? <><Check className="mr-1 h-3 w-3" /> Save Definitions</> : <><Pencil className="mr-1 h-3 w-3" /> Edit Descriptions</>}
                        </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {severities.map((s, index) => (
                        <div key={s.value} className="p-4 bg-muted/10 rounded-xl border border-border/50 group transition-all hover:border-primary/30 hover:bg-muted/20">
                            <div className="flex items-start gap-4">
                                <Badge variant="outline" className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border-primary bg-primary/5 text-primary shadow-sm">{s.value}</Badge>
                                <div className="flex-1 space-y-2">
                                    {isEditingSeverity ? (
                                        <div className="space-y-2">
                                            <Input 
                                                value={s.name} 
                                                onChange={(e) => handleSeverityChange(index, 'name', e.target.value)}
                                                className="h-8 text-xs font-bold bg-background uppercase"
                                            />
                                            <Textarea 
                                                value={s.description} 
                                                onChange={(e) => handleSeverityChange(index, 'description', e.target.value)}
                                                className="text-xs min-h-[60px] py-2 bg-background resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black uppercase tracking-tight text-foreground/80">{s.name}</p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{s.description}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Likelihood Definitions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Likelihood Scale (Probability)
                    </h3>
                    {canManage && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-3 text-[10px] uppercase font-bold"
                            onClick={() => setIsEditingLikelihood(!isEditingLikelihood)}
                        >
                            {isEditingLikelihood ? <><Check className="mr-1 h-3 w-3" /> Save Definitions</> : <><Pencil className="mr-1 h-3 w-3" /> Edit Descriptions</>}
                        </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {likelihoods.map((l, index) => (
                        <div key={l.value} className="p-4 bg-muted/10 rounded-xl border border-border/50 group transition-all hover:border-primary/30 hover:bg-muted/20">
                            <div className="flex items-start gap-4">
                                <Badge variant="outline" className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border-primary bg-primary/5 text-primary shadow-sm">{l.value}</Badge>
                                <div className="flex-1 space-y-2">
                                    {isEditingLikelihood ? (
                                        <div className="space-y-2">
                                            <Input 
                                                value={l.name} 
                                                onChange={(e) => handleLikelihoodChange(index, 'name', e.target.value)}
                                                className="h-8 text-xs font-bold bg-background uppercase"
                                            />
                                            <Textarea 
                                                value={l.description} 
                                                onChange={(e) => handleLikelihoodChange(index, 'description', e.target.value)}
                                                className="text-xs min-h-[60px] py-2 bg-background resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black uppercase tracking-tight text-foreground/80">{l.name}</p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{l.description}</p>
                                        </>
                                    )}
                                </div>
                            </div>
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
