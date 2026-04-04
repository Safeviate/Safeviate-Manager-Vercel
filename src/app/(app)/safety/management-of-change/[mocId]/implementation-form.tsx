'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, MocRisk } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, AlertTriangle, Zap, ChevronDown, ShieldAlert, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { callAiFlow } from '@/lib/ai-client';
import type { AnalyzeMocInput, AnalyzeMocOutput } from '@/ai/flows/analyze-moc-flow';
import type { RiskMatrixSettings } from '@/types/risk';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
});

const mitigationSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    responsiblePersonId: z.string().default(''),
    completionDate: z.date(),
    status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']).default('Open'),
    residualRiskAssessment: riskAssessmentSchema.default({ likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }),
});

const riskSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    initialRiskAssessment: riskAssessmentSchema.default({ likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }),
    mitigations: z.array(mitigationSchema).default([]),
});

const hazardSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    risks: z.array(riskSchema).default([]),
});

const stepSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    hazards: z.array(hazardSchema).default([]),
});

const phaseSchema = z.object({
    id: z.string(),
    title: z.string().default(''),
    steps: z.array(stepSchema).default([]),
});

const formSchema = z.object({ phases: z.array(phaseSchema) });
type FormValues = z.infer<typeof formSchema>;

// ─── Data Mapping Helpers ─────────────────────────────────────────────────────
const mapDatesToObjects = (phases: any[]): FormValues['phases'] => {
    const def = { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' as const };
    return (phases || []).map(phase => ({
        id: phase.id || uuidv4(),
        title: phase.title || '',
        steps: (phase.steps || []).map((step: any) => ({
            id: step.id || uuidv4(),
            description: step.description || '',
            hazards: (step.hazards || []).map((hazard: any) => ({
                id: hazard.id || uuidv4(),
                description: hazard.description || '',
                risks: (hazard.risks || []).map((risk: any) => ({
                    id: risk.id || uuidv4(),
                    description: risk.description || '',
                    initialRiskAssessment: risk.initialRiskAssessment || { ...def },
                    mitigations: (risk.mitigations || []).map((m: any) => ({
                        id: m.id || uuidv4(),
                        description: m.description || '',
                        responsiblePersonId: m.responsiblePersonId || '',
                        completionDate: m.completionDate ? new Date(m.completionDate) : new Date(),
                        status: m.status || 'Open',
                        residualRiskAssessment: m.residualRiskAssessment || { ...def },
                    })),
                })),
            })),
        })),
    }));
};

const mapDatesToStrings = (phases: FormValues['phases']): MocPhase[] =>
    phases.map(phase => ({
        ...phase,
        id: phase.id,
        title: phase.title || '',
        steps: (phase.steps || []).map(step => ({
            ...step,
            id: step.id,
            description: step.description || '',
            hazards: (step.hazards || []).map(hazard => ({
                ...hazard,
                id: hazard.id,
                description: hazard.description || '',
                risks: (hazard.risks || []).map(risk => ({
                    ...risk,
                    id: risk.id,
                    description: risk.description || '',
                    initialRiskAssessment: risk.initialRiskAssessment,
                    mitigations: (risk.mitigations || []).map(m => ({
                        ...m,
                        description: m.description || '',
                        responsiblePersonId: m.responsiblePersonId || '',
                        completionDate: m.completionDate.toISOString(),
                        residualRiskAssessment: m.residualRiskAssessment,
                    })),
                })),
            })),
        })),
    }));

// ─── Risk Score Helpers ───────────────────────────────────────────────────────
const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
    if (score <= 4) return 'Low';
    if (score <= 9) return 'Medium';
    if (score <= 16) return 'High';
    return 'Critical';
};

const getRiskScoreColor = (l: number, s: number, colors?: Record<string, string>) => {
    const letters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const id = `${l}${letters[s] ?? 'E'}`;
    if (colors?.[id]) {
        const hex = colors[id].replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return { 
            backgroundColor: colors[id], 
            color: yiq >= 128 ? 'black' : 'white',
            borderColor: 'rgba(0,0,0,0.1)'
        };
    }
    const score = l * s;
    if (score > 9) return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }; // Red
    if (score > 4) return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }; // Amber
    return { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }; // Emerald
};

// ─── Shared Sub-components ────────────────────────────────────────────────────

/** Mirroring the Coherence Matrix header row style */
const MatrixRowHeader = ({
    levelLabel,
    titleNode,
    actions,
    style,
    className,
}: {
    levelLabel: string;
    titleNode: React.ReactNode;
    actions?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}) => (
    <div className={cn('flex items-center justify-between gap-3 px-5 py-3', className)} style={style}>
        <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{levelLabel}</p>
            <div className="text-sm font-semibold leading-snug">{titleNode}</div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
);

const ExpandButton = () => (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-background text-muted-foreground">
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </div>
);

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-slate-200 bg-background/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">{label}</p>
        <p className="text-sm font-medium leading-relaxed text-foreground">{value}</p>
    </div>
);

// ─── Risk Assessment Editor ───────────────────────────────────────────────────
const RiskAssessmentEditor = ({ path, label, riskMatrixColors, badgeStyles }: { path: string; label: string; riskMatrixColors?: Record<string, string>; badgeStyles?: boolean }) => {
    const { control, setValue, watch } = useFormContext();
    const likelihood = watch(`${path}.likelihood`, 1);
    const severity = watch(`${path}.severity`, 1);
    const riskScore = (likelihood || 1) * (severity || 1);
    const riskLevel = getRiskLevel(riskScore);
    const colors = getRiskScoreColor(likelihood, severity, riskMatrixColors);

    const letters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const matrixId = `${likelihood}${letters[severity]}`;

    React.useEffect(() => {
        setValue(`${path}.riskScore`, riskScore, { shouldDirty: true });
        setValue(`${path}.riskLevel`, riskLevel, { shouldDirty: true });
    }, [riskScore, riskLevel, path, setValue]);

    const RiskBadge = () => (
        <Badge 
            variant="outline" 
            className="h-6 px-2 gap-1.5 text-[9px] font-black uppercase tracking-tight border shadow-none"
            style={colors}
        >
            <span className="opacity-60">{label}</span>
            <span>{matrixId}—{riskLevel}</span>
        </Badge>
    );

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button type="button" className="hover:opacity-80 transition-opacity">
                    <RiskBadge />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 shadow-xl border-slate-200" align="start">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-muted-foreground">{label}</p>
                <div className="grid grid-cols-6 gap-1">
                    <div className="col-span-1" />
                    {[5, 4, 3, 2, 1].map(s => (
                        <div key={s} className="text-center text-[9px] font-black opacity-40 py-1">{letters[s]}</div>
                    ))}
                    {[1, 2, 3, 4, 5].map(l => (
                        <React.Fragment key={l}>
                            <div className="text-right pr-2 text-[9px] font-black opacity-40 flex items-center justify-end">{l}</div>
                            {[5, 4, 3, 2, 1].map(s => {
                                const active = likelihood === l && severity === s;
                                const scoreColor = getRiskScoreColor(l, s, riskMatrixColors);
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                            setValue(`${path}.likelihood`, l);
                                            setValue(`${path}.severity`, s);
                                        }}
                                        className={cn(
                                            "aspect-square rounded-sm border flex items-center justify-center transition-all",
                                            active ? "ring-2 ring-primary ring-offset-1 z-10 scale-110" : "hover:brightness-95 opacity-80"
                                        )}
                                        style={scoreColor}
                                    >
                                        <span className="text-[8px] font-bold opacity-40">{l}{letters[s]}</span>
                                    </button>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
                <div className="mt-3 flex justify-between items-center bg-muted/50 rounded-md p-2">
                    <div className="text-[10px]">
                        <span className="font-bold uppercase text-muted-foreground mr-2">Result:</span>
                        <span className="font-black">{matrixId} — {riskLevel}</span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// ─── Mitigations ─────────────────────────────────────────────────────────────
const MitigationsArray = ({ phaseIndex, stepIndex, hazardIndex, riskIndex, personnel, riskMatrixColors }: {
    phaseIndex: number; stepIndex: number; hazardIndex: number; riskIndex: number;
    personnel: Personnel[]; riskMatrixColors?: Record<string, string>;
}) => {
    const { control } = useFormContext();
    const basePath = `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations`;
    const { fields, append, remove } = useFieldArray({ control, name: basePath });

    return (
        <div className="space-y-3 pb-2">
            {fields.map((field, mi) => (
                <Collapsible key={field.id} className="rounded-lg border border-slate-200 overflow-hidden bg-background shadow-sm" defaultOpen>
                    <div className="flex items-center justify-between bg-white border-b border-slate-100 px-4 py-2">
                        <CollapsibleTrigger className="flex items-center gap-2 min-w-0 flex-1 text-left group">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500 opacity-60" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                Mitigation {mi + 1}
                            </span>
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-100 bg-white text-muted-foreground ml-auto mr-1">
                                <ChevronDown className="h-2.5 w-2.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(mi)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>

                    <CollapsibleContent>
                        <div className="p-4 pt-1 space-y-4">
                            <FormField control={control} name={`${basePath}.${mi}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Action Description</FormLabel>
                                        <FormControl><textarea placeholder="Describe the mitigation action..." {...field} className="w-full min-h-[60px] rounded-md border border-slate-200 p-2 text-sm focus-visible:outline-none focus:ring-1 focus:ring-primary shadow-sm" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={control} name={`${basePath}.${mi}.responsiblePersonId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Assignee</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-9 shadow-sm"><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl>
                                                <SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                <FormField control={control} name={`${basePath}.${mi}.completionDate`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Deadline</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn('w-full h-9 pl-3 font-medium text-sm justify-start shadow-sm', !field.value && 'text-muted-foreground')}>
                                                            {field.value ? format(field.value, 'dd MMM yyyy') : 'Select date'}
                                                            <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                <FormField control={control} name={`${basePath}.${mi}.status`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-9 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                            </div>

                            <RiskAssessmentEditor
                                path={`${basePath}.${mi}.residualRiskAssessment`}
                                label="Residual Risk After Mitigation"
                                riskMatrixColors={riskMatrixColors}
                            />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}

            <Button type="button" variant="outline" size="sm"
                onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}
                className="w-full h-8 border-none bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] tracking-widest gap-2 hover:bg-slate-100 flex items-center justify-center">
                <PlusCircle className="h-3 w-3" /> Add Mitigation Control
            </Button>
        </div>
    );
};

// ─── Risks Array ──────────────────────────────────────────────────────────────
const RisksArray = ({ phaseIndex, stepIndex, hazardIndex, personnel, riskMatrixColors }: {
    phaseIndex: number; stepIndex: number; hazardIndex: number;
    personnel: Personnel[]; riskMatrixColors?: Record<string, string>;
}) => {
    const { control } = useFormContext();
    const basePath = `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks`;
    const { fields, append, remove } = useFieldArray({ control, name: basePath });

    return (
        <div className="space-y-4">
            {fields.map((field, ri) => (
                <Collapsible key={field.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm" defaultOpen>
                    <div className="flex items-center justify-between border-b border-slate-100 p-4 py-2 bg-slate-50/40">
                        <CollapsibleTrigger className="flex items-center gap-2 min-w-0 flex-1 group">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 opacity-60" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Risk Assessment</span>
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-muted-foreground ml-auto mr-1">
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(ri)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <CollapsibleContent>
                        <div className="p-5 space-y-5">
                            <FormField control={control} name={`${basePath}.${ri}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <textarea 
                                                placeholder="Describe the potential data integrity risks and integration impacts..." 
                                                {...field} 
                                                className="w-full min-h-[50px] bg-white rounded-lg border border-slate-200 p-3 text-sm font-medium leading-relaxed shadow-inner placeholder:italic focus-visible:outline-none focus:ring-1 focus:ring-amber-200" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            
                            <div className="flex flex-wrap gap-2 items-center">
                                <RiskAssessmentEditor
                                    path={`${basePath}.${ri}.initialRiskAssessment`}
                                    label="Initial Risk"
                                    riskMatrixColors={riskMatrixColors}
                                />
                                <Badge variant="secondary" className="h-6 px-2 text-[9px] font-black uppercase border border-slate-200 shadow-none bg-emerald-50 text-emerald-800">Status: Low</Badge>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <MitigationsArray
                                    phaseIndex={phaseIndex} stepIndex={stepIndex}
                                    hazardIndex={hazardIndex} riskIndex={ri}
                                    personnel={personnel} riskMatrixColors={riskMatrixColors}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}

            <div className="flex justify-center text-center">
                <button type="button" 
                    onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}
                    className="text-[10px] font-black uppercase tracking-widest text-primary/70 hover:text-primary flex items-center gap-1.5 py-1">
                    <PlusCircle className="h-3 w-3" /> Define Potential Risk
                </button>
            </div>
        </div>
    );
};

// ─── Hazards Array ────────────────────────────────────────────────────────────
const HazardsArray = ({ phaseIndex, stepIndex, personnel, riskMatrixColors }: {
    phaseIndex: number; stepIndex: number;
    personnel: Personnel[]; riskMatrixColors?: Record<string, string>;
}) => {
    const { control } = useFormContext();
    const basePath = `phases.${phaseIndex}.steps.${stepIndex}.hazards`;
    const { fields, append, remove } = useFieldArray({ control, name: basePath });

    return (
        <div className="space-y-4">
            {fields.map((field, hi) => (
                <Collapsible key={field.id} className="rounded-xl border border-amber-100 shadow-sm overflow-hidden bg-[#fffdf5]" defaultOpen>
                    <div className="flex items-center justify-between p-4 py-2 border-b border-amber-100/50">
                        <CollapsibleTrigger className="flex items-center gap-2 min-w-0 flex-1 text-left group">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2">Hazard No</span>
                            <FormField control={control} name={`${basePath}.${hi}.description`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Hazard identification..." {...field}
                                                className="border-none shadow-none font-black text-sm p-0 h-auto focus-visible:ring-0 bg-transparent uppercase tracking-tight text-foreground" />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            <div className="flex h-7 w-7 items-center justify-center rounded border border-amber-200 bg-white text-muted-foreground ml-2 shrink-0">
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-1.5 text-muted-foreground hover:text-destructive" onClick={() => remove(hi)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <CollapsibleContent>
                        <div className="p-5 space-y-4">
                            <RisksArray
                                phaseIndex={phaseIndex} stepIndex={stepIndex}
                                hazardIndex={hi} personnel={personnel}
                                riskMatrixColors={riskMatrixColors}
                            />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}

            <Button type="button" variant="ghost"
                onClick={() => append({ id: uuidv4(), description: '', risks: [] })}
                className="w-full h-9 border border-amber-100 bg-amber-50/30 text-amber-800 font-extrabold uppercase text-[9px] tracking-[0.2em] gap-2 hover:bg-amber-50">
                <PlusCircle className="h-3.5 w-3.5" /> Identify New Hazard
            </Button>
        </div>
    );
};

// ─── Steps Array ──────────────────────────────────────────────────────────────
const StepsArray = ({ phaseIndex, personnel, riskMatrixColors, matrixTheme }: {
    phaseIndex: number; personnel: Personnel[];
    riskMatrixColors?: Record<string, string>;
    matrixTheme: Record<string, string>;
}) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `phases.${phaseIndex}.steps` });

    return (
        <div className="space-y-4">
            {fields.map((step, si) => (
                <Collapsible key={step.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-none bg-background" defaultOpen>
                    <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100 bg-background uppercase">
                        <CollapsibleTrigger className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Phase {phaseIndex + 1} &gt; Step {si + 1}</p>
                                <FormField control={control} name={`phases.${phaseIndex}.steps.${si}.description`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Input placeholder="Describe this step..." {...field}
                                                    className="border-none shadow-none font-bold text-sm p-0 h-auto focus-visible:ring-0 bg-transparent text-foreground uppercase tracking-tight" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-100 bg-background text-muted-foreground transition-transform">
                                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-1.5 text-muted-foreground hover:text-destructive" onClick={() => remove(si)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <CollapsibleContent>
                        <div className="p-5">
                            <HazardsArray phaseIndex={phaseIndex} stepIndex={si} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}

            <Button type="button" variant="ghost"
                onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
                className="w-full h-10 border border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] gap-2 tracking-[0.2em] text-slate-500 hover:bg-slate-100">
                <PlusCircle className="h-4 w-4" /> Add Execution Step
            </Button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface ImplementationFormProps {
    moc: ManagementOfChange;
    tenantId: string;
    personnel: Personnel[];
}

export interface ImplementationFormHandle {
    submit: () => void;
    analyze: () => void;
    addPhase: () => void;
}

export const ImplementationForm = forwardRef<ImplementationFormHandle, ImplementationFormProps>(({ moc, tenantId, personnel }, ref) => {
    const { toast } = useToast();
    const { matrixTheme } = useTheme();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const formKey = useMemo(() => moc.id || uuidv4(), [moc.id]);
    const riskMatrixSettings = null;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: useMemo(() => ({ phases: mapDatesToObjects(moc.phases || []) }), [moc]),
    });

    const { fields: phaseFields, append: appendPhase, remove: removePhase } = useFieldArray({
        control: form.control,
        name: 'phases',
    });

    const onSubmit = (values: FormValues) => {
        void fetch(`/api/management-of-change?mocId=${encodeURIComponent(moc.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moc: { ...moc, phases: mapDatesToStrings(values.phases) } }),
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error((await response.json())?.error || 'Failed to save strategy.');
                }
                toast({ title: 'Strategy Saved', description: 'The implementation plan has been synchronised.' });
            })
            .catch((error: unknown) => {
                toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: error instanceof Error ? error.message : 'Failed to save strategy.',
                });
            });
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await callAiFlow<AnalyzeMocInput, AnalyzeMocOutput>('analyzeMoc', {
                title: moc.title, description: moc.description, reason: moc.reason, scope: moc.scope,
            });
            form.reset({ phases: mapDatesToObjects(result.phases) });
            toast({ title: 'AI Insights Applied' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'AI Analysis Failed', description: e.message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    useImperativeHandle(ref, () => ({
        submit: () => form.handleSubmit(onSubmit)(),
        analyze: handleAnalyze,
        addPhase: () => appendPhase({ id: uuidv4(), title: '', steps: [] }),
    }));

    return (
        <FormProvider {...form}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 h-full flex flex-col" key={formKey}>
                    <Card className="shadow-none border rounded-xl overflow-hidden flex flex-col flex-1 border-slate-200">
                        <MainPageHeader title="Implementation Strategy" />

                        <CardContent className="p-0 bg-background flex-1 overflow-y-auto no-scrollbar">

                            {/* ── Title card ─────────────────────────────────── */}
                            <div className="border-b bg-muted/10 p-6">
                                <Card className="overflow-hidden border-slate-200 shadow-none">
                                    <CardHeader className="border-b bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-1">Title Card</p>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] font-black uppercase text-primary">{moc.mocNumber}</Badge>
                                            <Badge variant="outline" className="text-[10px] font-black uppercase">{moc.status}</Badge>
                                        </div>
                                        <h2 className="text-xl font-black tracking-tight text-foreground">{moc.title}</h2>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 p-5 md:grid-cols-3">
                                        <SummaryCard label="Detailed Description" value={moc.description} />
                                        <SummaryCard label="Reason For Change" value={moc.reason} />
                                        <SummaryCard label="Scope Of Change" value={moc.scope} />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* ── Phases ────────────────────────────────────── */}
                            <div className="space-y-6 p-6">
                                {phaseFields.length > 0 ? phaseFields.map((field, pi) => (
                                    <Collapsible key={field.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm" defaultOpen>
                                        <div
                                            className="flex items-center justify-between px-5 py-2.5 border-b"
                                            style={{
                                                backgroundColor: '#059669',
                                                color: 'white',
                                            }}
                                        >
                                            <CollapsibleTrigger className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                                                <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                                                    <Zap className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Phase {pi + 1}</p>
                                                    <FormField control={form.control} name={`phases.${pi}.title`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl>
                                                                    <Input className="text-base font-black border-none shadow-none p-0 focus-visible:ring-0 uppercase tracking-tight h-auto bg-transparent text-inherit" placeholder="Phase Title..." {...field} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                </div>
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/20 bg-transparent text-white mr-1.5 opacity-60">
                                                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                </div>
                                            </CollapsibleTrigger>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => removePhase(pi)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="p-6 space-y-6 bg-slate-50/20">
                                                <StepsArray
                                                    phaseIndex={pi}
                                                    personnel={personnel}
                                                    riskMatrixColors={riskMatrixSettings?.colors}
                                                    matrixTheme={matrixTheme as Record<string, string>}
                                                />
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                )) : (
                                    <div className="py-24 text-center text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest opacity-40">
                                        No strategy phases defined. Use &ldquo;Add Phase&rdquo; to begin.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </FormProvider>
    );
});

ImplementationForm.displayName = 'ImplementationForm';
