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
    '5A': '#d9534f', '5B': '#d9534f', '5C': '#f0ad4e', '5D': '#f0ad4e', '5E': '#f0ad4e',
    '4A': '#d9534f', '4B': '#d9534f', '4C': '#d9534f', '4D': '#5cb85c', '4E': '#5cb85c',
    '3A': '#d9534f', '3B': '#d9534f', '3C': '#f0ad4e', '3D': '#5cb85c', '3E': '#5cb85c',
    '2A': '#f0ad4e', '2B': '#f0ad4e', '2C': '#5cb85c', '2D': '#5cb85c', '2E': '#5cb85c',
    '1A': '#f0ad4e', '1B': '#5cb85c', '1C': '#5cb85c', '1D': '#5cb85c', '1E': '#5cb85c',
};

export default function RiskMatrixPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const settingsId = 'risk-matrix-config';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const settingsRef = useMemoFirebase(() => (
    firestore ? doc(firestore, 'tenants', tenantId, 'settings', settingsId) : null
  ), [firestore, tenantId]);

  const { data: riskMatrixSettings, isLoading } = useDoc<RiskMatrixSettings>(settingsRef);

  const [colors, setColors] = useState<Record<string, string>>(defaultColors);
  const [likelihoods, setLikelihoods] = useState(defaultLikelihoods);
  const [severities, setSeverities] = useState(defaultSeverities);
  
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
      setActiveCell(cellId);
      if (colorInputRef.current) {
          colorInputRef.current.click();
      }
  };

  return (
    <div className="space-y-6 pb-10">
      <Card>
        <CardHeader className="py-4">
          <CardTitle>Risk Matrix Configuration</CardTitle>
          <CardDescription>
            This matrix is used to determine the level of risk associated with an identified hazard. Right-click a cell to change the color.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-w-4xl mx-auto border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse border-separate" style={{ borderSpacing: 0 }}>
                <colgroup>
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                </colgroup>
                <thead>
                    <tr className="h-16">
                        <th className="border-b border-r border-slate-200 dark:border-slate-700 bg-muted/30"></th>
                        {severities.map(s => (
                            <th key={s.value} className="border-r border-b border-slate-200 dark:border-slate-700 p-1 text-center align-middle font-bold text-[9px] uppercase tracking-wider bg-muted/30">
                                {s.name} ({s.value})
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
                                        "cursor-pointer hover:scale-[0.98] active:scale-95"
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-none border">
          <CardHeader className="py-3 border-b bg-muted/5">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-primary">Severity Definitions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {severities.map((s, index) => (
                <div key={s.value} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center font-bold">{s.value}</Badge>
                        <Input 
                            value={s.name} 
                            onChange={(e) => handleSeverityChange(index, 'name', e.target.value)}
                            className="h-7 text-xs font-bold"
                            placeholder="Name"
                        />
                    </div>
                    <Textarea 
                        value={s.description} 
                        onChange={(e) => handleSeverityChange(index, 'description', e.target.value)}
                        className="text-xs min-h-[40px] py-1"
                        placeholder="Description"
                    />
                </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="py-3 border-b bg-muted/5">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-primary">Likelihood Definitions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {likelihoods.map((l, index) => (
                <div key={l.value} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center font-bold">{l.value}</Badge>
                        <Input 
                            value={l.name} 
                            onChange={(e) => handleLikelihoodChange(index, 'name', e.target.value)}
                            className="h-7 text-xs font-bold"
                            placeholder="Name"
                        />
                    </div>
                    <Textarea 
                        value={l.description} 
                        onChange={(e) => handleLikelihoodChange(index, 'description', e.target.value)}
                        className="text-xs min-h-[40px] py-1"
                        placeholder="Description"
                    />
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
