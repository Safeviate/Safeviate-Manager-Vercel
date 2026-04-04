'use client';

import React from 'react';
import { useForm, useFieldArray, useFormContext, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, ReportHazard, ReportRisk } from '@/types/safety-report';
import { PlusCircle, Trash2, Save, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RiskMatrixSettings } from '@/types/risk';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// --- Helper Functions ---
const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
    if (score <= 4) return 'Low';
    if (score <= 9) return 'Medium';
    if (score <= 16) return 'High';
    return 'Critical';
}

const getRiskScoreColor = (
    likelihood: number,
    severity: number,
    colors?: Record<string, string>
  ): { backgroundColor: string; color: string } => {
    const severityToLetter: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const severityLetter = severityToLetter[severity] || 'E';
    const cellId = `${likelihood}${severityLetter}`;
    
    if (colors && colors[cellId]) {
        const hex = colors[cellId].replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? 'black' : 'white';
        return { backgroundColor: colors[cellId], color: textColor };
    }
    
    const score = likelihood * severity;
    if (score > 9) return { backgroundColor: '#ef4444', color: 'white' };
    if (score > 4) return { backgroundColor: '#f59e0b', color: 'black' };
    return { backgroundColor: '#10b981', color: 'white' };
};

// --- Form Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportRiskSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Risk description is required."),
    riskAssessment: riskAssessmentSchema,
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    risks: z.array(reportRiskSchema).optional(),
});

const hazardIdentificationSchema = z.object({
  initialHazards: z.array(reportHazardSchema),
});

type FormValues = z.infer<typeof hazardIdentificationSchema>;

const RiskAssessmentEditor = ({ path, label, riskMatrixColors }: { path: string; label: string; riskMatrixColors?: Record<string, string> }) => {
    const { control, setValue, watch } = useFormContext<FormValues>();
    
    const likelihood = watch(`${path}.likelihood` as any) || 1;
    const severity = watch(`${path}.severity` as any) || 1;
    
    const riskScore = likelihood * severity;
    const riskLevel = getRiskLevel(riskScore);
    const riskColors = getRiskScoreColor(likelihood, severity, riskMatrixColors);

    const likelihoodLabels: Record<number, string> = {
        5: 'Frequent', 4: 'Occasional', 3: 'Remote', 2: 'Improbable', 1: 'Ext. Improbable',
    };
    
    const severityLabels: Record<number, { letter: string; name: string }> = {
        5: { letter: 'A', name: 'Catastrophic' },
        4: { letter: 'B', name: 'Hazardous' },
        3: { letter: 'C', name: 'Major' },
        2: { letter: 'D', name: 'Minor' },
        1: { letter: 'E', name: 'Negligible' },
    };

    React.useEffect(() => {
        setValue(`${path}.riskScore` as any, riskScore);
        setValue(`${path}.riskLevel` as any, riskLevel);
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <div 
            className="border border-slate-200 rounded-xl p-4 mb-4 transition-colors"
            style={{ backgroundColor: riskColors.backgroundColor, color: riskColors.color }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 opacity-70" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</h5>
                </div>
                <Badge variant="outline" className="h-6 font-black text-[10px] border-white/20 bg-white/10 text-inherit">
                    {likelihood}{severityLabels[(severity as number) || 1]?.letter} - {riskLevel}
                </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <Controller 
                    control={control} 
                    name={`${path}.likelihood` as any} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-0 sm:min-w-[180px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Likelihood:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{likelihoodLabels[(value as number) || 1]}</span>
                            </div>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 text-xs font-bold transition-all shrink-0",
                                            value === num 
                                                ? "bg-white text-black shadow-md border-white" 
                                                : "bg-transparent hover:bg-white/10 border-current opacity-70"
                                        )}
                                        onClick={() => onChange(num)}
                                    >
                                        {num}
                                    </Button>
                                ))}
                            </div>
                        </div> 
                    )} 
                />
                <Controller 
                    control={control} 
                    name={`${path}.severity` as any} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-0 sm:min-w-[180px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Severity:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{severityLabels[(value as number) || 1]?.name}</span>
                            </div>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {[5, 4, 3, 2, 1].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 text-xs font-bold transition-all shrink-0",
                                            value === num 
                                                ? "bg-white text-black shadow-md border-white" 
                                                : "bg-transparent hover:bg-white/10 border-current opacity-70"
                                        )}
                                        onClick={() => onChange(num)}
                                    >
                                        {severityLabels[num]?.letter}
                                    </Button>
                                ))}
                            </div>
                        </div> 
                    )}
                />
            </div>
        </div>
    );
};

const RisksArray = ({ hazardIndex, riskMatrixColors }: { hazardIndex: number; riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `initialHazards.${hazardIndex}.risks`,
    });

    return (
        <div className="space-y-3 pl-0 mt-3">
            {fields.map((field, riskIndex) => (
                <div key={field.id} className="p-3 bg-muted/30 border rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                        <FormField
                            control={control}
                            name={`initialHazards.${hazardIndex}.risks.${riskIndex}.description`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Identified Risk / Outcome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Loss of separation, Mid-air collision" {...field} className="h-8 text-xs bg-background font-medium" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(riskIndex)} 
                            className="h-8 w-8 text-destructive mt-5 no-print"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <RiskAssessmentEditor 
                        path={`initialHazards.${hazardIndex}.risks.${riskIndex}.riskAssessment`}
                        label="Risk Assessment"
                        riskMatrixColors={riskMatrixColors}
                    />
                </div>
            ))}
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ 
                    id: uuidv4(), 
                    description: '', 
                    riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } 
                })}
                className="h-7 px-3 text-[10px] font-black uppercase border-slate-300 no-print"
            >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Risk Impact
            </Button>
        </div>
    );
};

interface HazardIdentificationFormProps {
  report: SafetyReport;
  tenantId: string;
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
}

export function HazardIdentificationForm({ report, tenantId, riskMatrixColors, isStacked = false }: HazardIdentificationFormProps) {
  const { toast } = useToast();
  const activeRiskMatrixColors = riskMatrixColors;

  const form = useForm<FormValues>({
    resolver: zodResolver(hazardIdentificationSchema),
    defaultValues: {
      initialHazards: report.initialHazards || [],
    },
  });

  const { fields: hazardFields, append: appendHazard, remove: removeHazard } = useFieldArray({
    control: form.control,
    name: "initialHazards",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: { ...report, ...values } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save hazard identification.');
      }
      toast({ title: 'Hazard Identification Saved' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save hazard identification.',
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className="shrink-0 border-b bg-muted/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-black uppercase tracking-tight">Hazard & Risk Identification</h3>
        <Button type="button" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '', risks: [] })} className="font-black uppercase text-xs h-9 px-6 shadow-md no-print">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
        </Button>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-6">
                  <HazardFields hazardFields={hazardFields} form={form} riskMatrixColors={activeRiskMatrixColors} removeHazard={removeHazard} />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    <HazardFields hazardFields={hazardFields} form={form} riskMatrixColors={activeRiskMatrixColors} removeHazard={removeHazard} />
                  </div>
                </ScrollArea>
              )}
              {!isStacked && (
                <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                    <Button type="submit" className="font-black uppercase text-xs h-10 px-8 shadow-md">
                    <Save className="mr-2 h-4 w-4" /> Save Hazard Identification
                    </Button>
                </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </div>
  );
}

function HazardFields({ hazardFields, form, riskMatrixColors, removeHazard }: { hazardFields: any[], form: any, riskMatrixColors?: Record<string, string>, removeHazard: (i: number) => void }) {
  return (
    <>
      {hazardFields.map((field, index) => (
          <div key={field.id} className="rounded-xl border bg-muted/10 overflow-hidden border-slate-200">
              <div className="p-4 border-b bg-background/50">
                  <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">
                          {index + 1}
                      </div>
                      <FormField control={form.control} name={`initialHazards.${index}.description`} render={({ field }) => (
                          <FormItem className='flex-1 space-y-0'>
                              <FormControl>
                                  <Input placeholder="Describe the hazard (e.g., Bird strike on final)..." {...field} className="h-9 text-sm font-black bg-background border-slate-300" />
                              </FormControl>
                          </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeHazard(index)} className="text-destructive no-print hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </div>
              </div>
              <div className="p-4 pt-2">
                  <RisksArray hazardIndex={index} riskMatrixColors={riskMatrixColors} />
              </div>
          </div>
      ))}
      {hazardFields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">No hazards identified yet.</p>
              <p className="text-xs font-medium">Start by identifying the primary hazards associated with this report.</p>
          </div>
      )}
    </>
  );
}
