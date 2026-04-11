'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, MocRisk, MocMitigation } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, AlertTriangle, Zap, ShieldAlert, ShieldCheck, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import React, { useState, useMemo, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { callAiFlow } from '@/lib/ai-client';
import type { AnalyzeMocInput, AnalyzeMocOutput } from '@/ai/flows/analyze-moc-flow';
import type { RiskMatrixSettings } from '@/types/risk';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { parseJsonResponse } from '@/lib/safe-json';

const parseLocalDate = (value?: string | Date | null) => {
    if (!value) return undefined;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        const fallback = new Date(value);
        return Number.isNaN(fallback.getTime()) ? undefined : fallback;
    }
    return new Date(year, month - 1, day, 12);
};

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
type MocPhaseInput = Partial<Omit<MocPhase, 'steps'>> & { steps?: MocStepInput[] };
type MocStepInput = Partial<Omit<MocStep, 'hazards'>> & { hazards?: MocHazardInput[] };
type MocHazardInput = Partial<Omit<MocHazard, 'risks'>> & { risks?: MocRiskInput[] };
type MocRiskInput = Partial<Omit<MocRisk, 'mitigations'>> & { mitigations?: MocMitigationInput[] };
type MocMitigationInput = Partial<Omit<MocMitigation, 'completionDate'>> & { completionDate?: string | Date | null };

const mapDatesToObjects = (phases: MocPhaseInput[]): FormValues['phases'] => {
    const def = { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' as const };
    return (phases || []).map(phase => ({
        id: phase.id || uuidv4(),
        title: phase.title || '',
        steps: (phase.steps || []).map((step) => ({
            id: step.id || uuidv4(),
            description: step.description || '',
            hazards: (step.hazards || []).map((hazard) => ({
                id: hazard.id || uuidv4(),
                description: hazard.description || '',
                risks: (hazard.risks || []).map((risk) => ({
                    id: risk.id || uuidv4(),
                    description: risk.description || '',
                    initialRiskAssessment: risk.initialRiskAssessment || { ...def },
                    mitigations: (risk.mitigations || []).map((m) => ({
                        id: m.id || uuidv4(),
                        description: m.description || '',
                        responsiblePersonId: m.responsiblePersonId || '',
                        completionDate: parseLocalDate(m.completionDate) || new Date(),
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
                        completionDate: new Date(Date.UTC(m.completionDate.getFullYear(), m.completionDate.getMonth(), m.completionDate.getDate(), 12)).toISOString(),
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

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-slate-200 bg-background/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">{label}</p>
        <p className="text-sm font-medium leading-relaxed text-foreground">{value}</p>
    </div>
);

const SummaryChip = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' }) => {
    const toneClasses = {
        neutral: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
    } as const;

    return (
        <span className={cn('rounded-full border px-3 py-1 text-[10px] font-semibold', toneClasses[tone])}>
            {children}
        </span>
    );
};

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
        <div className="space-y-2 pb-2">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}
                >
                    <PlusCircle className="h-3 w-3" />
                    Add Mitigation
                </Button>
            </div>
            {fields.map((field, mi) => (
                <div key={field.id} className="border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-80" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Mitigation {mi + 1}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                                onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}
                            >
                                <PlusCircle className="h-3 w-3" />
                                Add
                            </Button>
                            <RiskAssessmentEditor
                                path={`${basePath}.${mi}.residualRiskAssessment`}
                                label="Residual Risk"
                                riskMatrixColors={riskMatrixColors}
                            />
                            <Badge variant="secondary" className="h-6 px-2 text-[9px] font-black uppercase border border-slate-200 shadow-none bg-slate-50 text-slate-700">
                                Status: Open
                            </Badge>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(mi)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 p-3">
                            <FormField control={control} name={`${basePath}.${mi}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl><textarea placeholder="Describe the mitigation action..." {...field} className="w-full min-h-[110px] rounded-md border border-slate-200 bg-white p-3 text-sm focus-visible:outline-none focus:ring-1 focus:ring-primary" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <FormField control={control} name={`${basePath}.${mi}.responsiblePersonId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Assignee</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-9 border-slate-200 bg-white"><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl>
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
                                                        <Button variant="outline" className={cn('w-full h-9 justify-start border-slate-200 bg-white pl-3 text-sm font-medium', !field.value && 'text-muted-foreground')}>
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
                                                <FormControl><SelectTrigger className="h-9 border-slate-200 bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                            </div>

                        </div>
                </div>
            ))}
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
    const watchedRisks = useWatch({ control, name: basePath }) as FormValues['phases'][number]['steps'][number]['hazards'][number]['risks'] | undefined;

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}
                >
                    <PlusCircle className="h-3 w-3" />
                    Add Risk
                </Button>
            </div>
            {fields.map((field, ri) => (
                <div key={field.id} className="border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 bg-white">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 opacity-60" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Risk Assessment</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <SummaryChip tone="neutral">
                                {(watchedRisks?.[ri]?.mitigations?.length ?? 0)} mitigations
                            </SummaryChip>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                                onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}
                            >
                                <PlusCircle className="h-3 w-3" />
                                Add
                            </Button>
                            <RiskAssessmentEditor
                                path={`${basePath}.${ri}.initialRiskAssessment`}
                                label="Initial Risk"
                                riskMatrixColors={riskMatrixColors}
                            />
                            <Badge variant="secondary" className="h-6 px-2 text-[9px] font-black uppercase border border-slate-200 shadow-none bg-emerald-50 text-emerald-800">
                                Status: Low
                            </Badge>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(ri)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4 p-3">
                            <FormField control={control} name={`${basePath}.${ri}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <textarea 
                                                placeholder="Describe the potential data integrity risks and integration impacts..." 
                                                {...field} 
                                                className="w-full min-h-[110px] rounded-md border border-slate-200 bg-white p-3 text-sm font-medium leading-relaxed placeholder:italic focus-visible:outline-none focus:ring-1 focus:ring-amber-200" 
                                            />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            
                            <div className="border-t border-slate-100 pt-2">
                                <MitigationsArray
                                    phaseIndex={phaseIndex} stepIndex={stepIndex}
                                    hazardIndex={hazardIndex} riskIndex={ri}
                                    personnel={personnel} riskMatrixColors={riskMatrixColors}
                                />
                            </div>
                    </div>
                </div>
            ))}
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
    const watchedHazards = useWatch({ control, name: basePath }) as FormValues['phases'][number]['steps'][number]['hazards'] | undefined;

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => append({ id: uuidv4(), description: '', risks: [] })}
                >
                    <PlusCircle className="h-3 w-3" />
                    Add Hazard
                </Button>
            </div>
            {fields.map((field, hi) => (
                <details key={field.id} open className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 marker:content-none">
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Hazard {hi + 1}</span>
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                                Expand to edit the hazard details and linked risks.
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <SummaryChip tone="neutral">
                                {(watchedHazards?.[hi]?.risks?.length ?? 0)} risks
                            </SummaryChip>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                                onClick={(e) => {
                                    e.preventDefault();
                                    append({ id: uuidv4(), description: '', risks: [] });
                                }}
                            >
                                <PlusCircle className="h-3 w-3" />
                                Add Risk
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); remove(hi); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </summary>

                    <div className="space-y-3 px-3 py-3">
                            <FormField control={control} name={`${basePath}.${hi}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Hazard detail</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe the hazard..."
                                                {...field}
                                                className="min-h-[110px] resize-y border-slate-200 bg-white text-sm font-semibold text-slate-900"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            <RisksArray
                                phaseIndex={phaseIndex} stepIndex={stepIndex}
                                hazardIndex={hi} personnel={personnel}
                                riskMatrixColors={riskMatrixColors}
                            />
                    </div>
                </details>
            ))}
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
    const watchedSteps = useWatch({ control, name: `phases.${phaseIndex}.steps` }) as FormValues['phases'][number]['steps'] | undefined;

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 rounded-full border border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
                >
                    <PlusCircle className="h-3 w-3" />
                    Add Step
                </Button>
            </div>
            {fields.map((step, si) => (
                <div key={step.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Step {si + 1}</p>
                            <FormField control={control} name={`phases.${phaseIndex}.steps.${si}.description`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Describe this step..." {...field}
                                                className="border-none shadow-none p-0 h-auto text-base font-semibold focus-visible:ring-0 bg-transparent text-foreground" />
                                        </FormControl>
                                    </FormItem>
                                )} />
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <SummaryChip tone="neutral">
                                {(watchedSteps?.[si]?.hazards?.length ?? 0)} hazards
                            </SummaryChip>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(si)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 px-4 py-4">
                        <HazardsArray phaseIndex={phaseIndex} stepIndex={si} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                    </div>
                </div>
            ))}
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
    hasUnsavedChanges: () => boolean;
}

export const ImplementationForm = forwardRef<ImplementationFormHandle, ImplementationFormProps>(({ moc, tenantId, personnel }, ref) => {
    const { toast } = useToast();
    const { matrixTheme } = useTheme();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
    const [pendingScrollPhaseId, setPendingScrollPhaseId] = useState<string | null>(null);
    const phaseCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const formKey = useMemo(() => moc.id || uuidv4(), [moc.id]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: useMemo(() => ({ phases: mapDatesToObjects(moc.phases || []) }), [moc]),
    });

    const { fields: phaseFields, append: appendPhase, remove: removePhase } = useFieldArray({
        control: form.control,
        name: 'phases',
    });
    const watchedPhases = useWatch({ control: form.control, name: 'phases' }) as FormValues['phases'] | undefined;
    const handleAddPhase = useCallback(() => {
        const newPhaseId = uuidv4();
        appendPhase({ id: newPhaseId, title: '', steps: [] });
        setCollapsedPhases((prev) => ({ ...prev, [newPhaseId]: false }));
        setPendingScrollPhaseId(newPhaseId);
    }, [appendPhase]);

    React.useEffect(() => {
        if (!pendingScrollPhaseId) return;
        const phaseExists = phaseFields.some((phase) => phase.id === pendingScrollPhaseId);
        if (!phaseExists) return;

        const raf = window.requestAnimationFrame(() => {
            phaseCardRefs.current[pendingScrollPhaseId]?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            setCollapsedPhases((prev) => ({ ...prev, [pendingScrollPhaseId]: false }));
            setPendingScrollPhaseId(null);
        });

        return () => window.cancelAnimationFrame(raf);
    }, [pendingScrollPhaseId, phaseFields]);

    const onSubmit = async (values: FormValues) => {
        setIsSaving(true);
        void fetch(`/api/management-of-change?mocId=${encodeURIComponent(moc.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moc: { ...moc, phases: mapDatesToStrings(values.phases) } }),
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error((await parseJsonResponse<{ error?: string }>(response))?.error || 'Failed to save strategy.');
                }
                form.reset(values);
                toast({ title: 'Strategy Saved', description: 'The implementation plan has been synchronised.' });
            })
            .catch((error: unknown) => {
                toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: error instanceof Error ? error.message : 'Failed to save strategy.',
                });
            })
            .finally(() => {
                setIsSaving(false);
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
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error instanceof Error ? error.message : 'AI analysis failed.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    useImperativeHandle(ref, () => ({
        submit: () => form.handleSubmit(onSubmit)(),
        analyze: handleAnalyze,
        addPhase: handleAddPhase,
        hasUnsavedChanges: () => form.formState.isDirty,
    }));

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!form.formState.isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [form.formState.isDirty]);

    return (
        <FormProvider {...form}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col space-y-0" key={formKey}>
                    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 shadow-none">
                        <MainPageHeader title="Implementation Strategy" />

                        <CardContent className="min-h-0 flex-1 overflow-hidden bg-background p-0 no-scrollbar">

                            {/* ── Title card ─────────────────────────────────── */}
                            <div className="border-b bg-muted/10 p-6">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <div className="border-b bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
                                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Change Brief</p>
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] font-black uppercase text-primary">{moc.mocNumber}</Badge>
                                            <Badge variant="outline" className="text-[10px] font-black uppercase">{moc.status}</Badge>
                                        </div>
                                        <h2 className="text-xl font-black tracking-tight text-foreground">{moc.title}</h2>
                                    </div>
                                    <div className="grid gap-0 md:grid-cols-3">
                                        <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r"><SummaryCard label="Detailed Description" value={moc.description} /></div>
                                        <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r"><SummaryCard label="Reason For Change" value={moc.reason} /></div>
                                        <div className="p-5"><SummaryCard label="Scope Of Change" value={moc.scope} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Phases ────────────────────────────────────── */}
                            <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="mx-auto w-full max-w-6xl space-y-5 px-6 pb-24">
                                <div className="sticky top-0 z-10 -mx-6 border-b border-slate-200 bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Phase Controls</p>
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Save your implementation phases after editing titles, steps, hazards, and mitigations.
                                            </p>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isSaving || !form.formState.isDirty}
                                            className="h-10 gap-2 rounded-full px-5 text-[10px] font-black uppercase tracking-[0.18em]"
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                            {isSaving ? 'Saving Strategy...' : form.formState.isDirty ? 'Save Strategy' : 'Strategy Saved'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 gap-2 rounded-full px-5 text-[10px] font-black uppercase tracking-[0.18em]"
                                            onClick={handleAddPhase}
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" />
                                            Add Phase
                                        </Button>
                                    </div>
                                </div>
                                {phaseFields.length > 0 ? phaseFields.map((field, pi) => {
                                    const isCollapsed = collapsedPhases[field.id] ?? false;
                                    const phaseData = watchedPhases?.[pi];
                                    const phaseSteps = phaseData?.steps?.length ?? 0;
                                    const phaseHazards = phaseData?.steps?.reduce((count, step) => count + (step.hazards?.length ?? 0), 0) ?? 0;
                                    const phaseRisks = phaseData?.steps?.reduce((count, step) => count + (step.hazards?.reduce((hazardCount, hazard) => hazardCount + (hazard.risks?.length ?? 0), 0) ?? 0), 0) ?? 0;
                                    return (
                                    <div
                                        key={field.id}
                                        ref={(node) => {
                                            phaseCardRefs.current[field.id] = node;
                                        }}
                                        className="border border-slate-200 bg-white shadow-none"
                                    >
                                        <div
                                            className="flex items-center justify-between border-b px-4 py-3"
                                            style={{
                                                backgroundColor: '#059669',
                                                color: 'white',
                                            }}
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <SummaryChip tone="neutral">{phaseSteps} steps</SummaryChip>
                                                        <SummaryChip tone="warning">{phaseHazards} hazards</SummaryChip>
                                                        <SummaryChip tone="success">{phaseRisks} risks</SummaryChip>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-white hover:bg-white/10"
                                                    onClick={() => setCollapsedPhases(prev => ({ ...prev, [field.id]: !isCollapsed }))}
                                                >
                                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    <span className="sr-only">Toggle phase</span>
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => removePhase(pi)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {!isCollapsed && (
                                            <div className="space-y-5 bg-white p-4">
                                                <StepsArray
                                                    phaseIndex={pi}
                                                    personnel={personnel}
                                                    riskMatrixColors={undefined}
                                                    matrixTheme={matrixTheme as Record<string, string>}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                                }) : (
                                    <div className="py-24 text-center text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest opacity-40">
                                        No strategy phases defined. Use &ldquo;Add Phase&rdquo; to begin.
                                    </div>
                                )}
                            </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </FormProvider>
    );
});

ImplementationForm.displayName = 'ImplementationForm';
