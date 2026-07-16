'use client';

import React from 'react';
import { useForm, useFieldArray, useFormContext, Controller, FormProvider, type FieldPath } from 'react-hook-form';
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
import type { CorrectiveAction, ReportHazard, SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, Save, AlertTriangle, ShieldCheck, CalendarIcon, BookPlus, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CARD_COMPACT_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { usePermissions } from '@/hooks/use-permissions';

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

const buildRiskAssessmentPath = (
    basePath: `initialHazards.${number}.risks.${number}.riskAssessment`,
    field: 'likelihood' | 'severity' | 'riskScore' | 'riskLevel',
): FieldPath<FormValues> => `${basePath}.${field}` as FieldPath<FormValues>;

const deriveCorrectiveActionsFromHazards = (
    hazards: ReportHazard[],
    existingActions: CorrectiveAction[] = [],
): CorrectiveAction[] =>
    hazards.flatMap((hazard) =>
        (hazard.risks || []).flatMap<CorrectiveAction>((risk) => {
            const mitigations = risk.mitigations || [];
            if (mitigations.length > 0) {
                return mitigations.map((mitigation) => {
                    const existingAction = existingActions.find((action) => action.id === mitigation.id);
                    const residual = mitigation.residualRiskAssessment;
                    return {
                        id: mitigation.id,
                        description: mitigation.description,
                        responsiblePersonId: existingAction?.responsiblePersonId || '',
                        hazardId: hazard.id,
                        riskId: risk.id,
                        riskAssessmentView: 'Residual',
                        residualLikelihood: residual.likelihood,
                        residualSeverity: residual.severity,
                        residualRiskScore: residual.riskScore,
                        residualRiskLevel: residual.riskLevel,
                        deadline: existingAction?.deadline || new Date().toISOString(),
                        status: existingAction?.status || 'Open',
                    } satisfies CorrectiveAction;
                });
            }

            const existingRiskAction = existingActions.find(
                (action) => action.hazardId === hazard.id && action.riskId === risk.id,
            );
            return [{
                id: existingRiskAction?.id || risk.id,
                description: existingRiskAction?.description || risk.description,
                responsiblePersonId: existingRiskAction?.responsiblePersonId || '',
                hazardId: hazard.id,
                riskId: risk.id,
                riskAssessmentView: 'Initial',
                residualLikelihood: risk.riskAssessment.likelihood,
                residualSeverity: risk.riskAssessment.severity,
                residualRiskScore: risk.riskAssessment.riskScore,
                residualRiskLevel: risk.riskAssessment.riskLevel,
                deadline: existingRiskAction?.deadline || new Date().toISOString(),
                status: existingRiskAction?.status || 'Open',
            } satisfies CorrectiveAction];
        }),
    );

// --- Form Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportRiskSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    riskAssessment: riskAssessmentSchema,
    mitigations: z.array(z.object({
      id: z.string(),
      description: z.string().default(''),
      residualRiskAssessment: riskAssessmentSchema,
    })).default([]),
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().default(''),
    risks: z.array(reportRiskSchema).optional(),
});

const hazardIdentificationSchema = z.object({
  initialHazards: z.array(reportHazardSchema),
});

type FormValues = z.infer<typeof hazardIdentificationSchema>;

const RiskAssessmentEditor = ({
    path,
    label,
    riskMatrixColors,
    compact = false,
}: {
    path: string;
    label: string;
    riskMatrixColors?: Record<string, string>;
    compact?: boolean;
}) => {
    const { control, setValue, watch } = useFormContext<FormValues>();
    const likelihoodPath = buildRiskAssessmentPath(path as `initialHazards.${number}.risks.${number}.riskAssessment`, 'likelihood');
    const severityPath = buildRiskAssessmentPath(path as `initialHazards.${number}.risks.${number}.riskAssessment`, 'severity');
    const riskScorePath = buildRiskAssessmentPath(path as `initialHazards.${number}.risks.${number}.riskAssessment`, 'riskScore');
    const riskLevelPath = buildRiskAssessmentPath(path as `initialHazards.${number}.risks.${number}.riskAssessment`, 'riskLevel');

    const likelihood = Number(watch(likelihoodPath)) || 1;
    const severity = Number(watch(severityPath)) || 1;
    
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
        setValue(riskScorePath, riskScore);
        setValue(riskLevelPath, riskLevel);
    }, [riskScore, riskLevel, riskScorePath, riskLevelPath, setValue]);

    const editorContent = (
        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4", compact && "gap-4")}>
            <Controller 
                control={control} 
                name={likelihoodPath} 
                render={({ field: { onChange, value } }) => {
                    const selectedLikelihood = Number(value) || 1;
                    return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Likelihood:</Label>
                            <span className="text-[10px] font-black uppercase truncate">{likelihoodLabels[selectedLikelihood]}</span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <Button
                                    key={num}
                                    type="button"
                                    variant={selectedLikelihood === num ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                        compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs",
                                        "font-bold transition-all shrink-0",
                                        selectedLikelihood === num 
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
                );}} 
            />
            <Controller 
                control={control} 
                name={severityPath} 
                render={({ field: { onChange, value } }) => {
                    const selectedSeverity = Number(value) || 1;
                    return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Severity:</Label>
                            <span className="text-[10px] font-black uppercase truncate">{severityLabels[selectedSeverity]?.name}</span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {[5, 4, 3, 2, 1].map((num) => (
                                <Button
                                    key={num}
                                    type="button"
                                    variant={selectedSeverity === num ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                        compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs",
                                        "font-bold transition-all shrink-0",
                                        selectedSeverity === num 
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
                );}}
            />
        </div>
    );

    if (compact) {
        return (
            <div className="mt-3 rounded-md border border-input bg-muted/30 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                </div>
                <div className="mt-3 grid min-w-0 items-end gap-3 md:grid-cols-3">
                    <FormField
                        control={control}
                        name={likelihoodPath}
                        render={({ field }) => (
                            <FormItem className="min-w-0">
                                <FormLabel className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">
                                    Likelihood
                                </FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    value={field.value ? String(field.value) : '1'}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-9 w-full min-w-0 border-input bg-background text-xs font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <SelectItem key={value} value={String(value)} className="text-xs">
                                                {value} - {likelihoodLabels[value]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={severityPath}
                        render={({ field }) => (
                            <FormItem className="min-w-0">
                                <FormLabel className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">
                                    Severity
                                </FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    value={field.value ? String(field.value) : '1'}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-9 w-full min-w-0 border-input bg-background text-xs font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <SelectItem key={value} value={String(value)} className="text-xs">
                                                {severityLabels[value]?.letter} - {severityLabels[value]?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <div className="flex min-w-0 flex-col gap-2">
                        <p className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">Risk Indicator</p>
                        <div
                            className="flex h-9 min-w-0 w-full items-center whitespace-nowrap rounded-md border border-input px-3 text-xs font-black"
                            style={{ backgroundColor: riskColors.backgroundColor, color: riskColors.color }}
                        >
                            {likelihood}{severityLabels[(severity as number) || 1]?.letter} - {riskLevel}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="mb-4 rounded-xl border border-card-border p-4 transition-colors"
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
            {editorContent}
        </div>
    );
};

const MitigationsArray = ({ hazardIndex, riskIndex, riskMatrixColors }: {
    hazardIndex: number;
    riskIndex: number;
    riskMatrixColors?: Record<string, string>;
}) => {
    const { control } = useFormContext<FormValues>();
    const basePath = `initialHazards.${hazardIndex}.risks.${riskIndex}.mitigations` as const;
    const { fields, append, remove } = useFieldArray({
        control,
        name: basePath,
    });

    return (
        <div className="mt-3">
            <div className="flex justify-end px-3 py-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`${HEADER_SECONDARY_BUTTON_CLASS} no-print`}
                    onClick={() => append({
                        id: uuidv4(),
                        description: '',
                        residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' },
                    })}
                >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add Corrective Action
                </Button>
            </div>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="mt-3 border-t border-input pt-3 first:mt-0 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Mitigation {mitigationIndex + 1}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(mitigationIndex)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="space-y-3 p-3">
                    <FormField
                        control={control}
                        name={`${basePath}.${mitigationIndex}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mitigation / Control</FormLabel>
                                <FormControl>
                                    <textarea
                                        placeholder="Describe the mitigation action to reduce this risk..."
                                        {...field}
                                        className="min-h-[56px] w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <RiskAssessmentEditor
                        path={`${basePath}.${mitigationIndex}.residualRiskAssessment`}
                        label="Residual Risk"
                        riskMatrixColors={riskMatrixColors}
                        compact
                    />
                    </div>
                </div>
            ))}
        </div>
    );
};

const RisksArray = ({ report, hazardIndex, riskMatrixColors }: { report: SafetyReport; hazardIndex: number; riskMatrixColors?: Record<string, string> }) => {
    const { control, getValues } = useFormContext<FormValues>();
    const { hasPermission } = usePermissions();
    const { toast } = useToast();
    const [registeringRiskId, setRegisteringRiskId] = React.useState<string | null>(null);
    const [registeredRiskIds, setRegisteredRiskIds] = React.useState<Set<string>>(new Set());
    const { fields, append, remove } = useFieldArray({
        control,
        name: `initialHazards.${hazardIndex}.risks`,
    });

    const addToRiskRegister = async (riskIndex: number) => {
        const hazard = getValues().initialHazards[hazardIndex];
        const risk = hazard?.risks?.[riskIndex];
        if (!hazard || !risk || registeringRiskId) return;

        setRegisteringRiskId(risk.id);
        try {
            const response = await fetch('/api/risk-register/from-safety-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report, hazard, risk }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || 'Unable to add this risk to the risk register.');

            setRegisteredRiskIds((current) => new Set(current).add(risk.id));
            toast({
                title: payload?.alreadyLinked
                    ? 'Already in Risk Register'
                    : payload?.linkedExisting
                        ? 'Linked to Risk Register'
                        : 'Added to Risk Register',
                description: payload?.alreadyLinked
                    ? 'This report occurrence is already linked to the register.'
                    : payload?.linkedExisting
                        ? 'This matching hazard was linked to the existing register entry without creating a duplicate.'
                        : 'The hazard and risk are now available in the Risk Register.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Risk Register update failed',
                description: error instanceof Error ? error.message : 'Unable to add this risk to the risk register.',
            });
        } finally {
            setRegisteringRiskId(null);
        }
    };

    return (
        <div className="space-y-3">
            {fields.map((field, riskIndex) => {
                const riskId = getValues().initialHazards[hazardIndex]?.risks?.[riskIndex]?.id || field.id;
                return (
                    <div key={field.id} className="overflow-hidden rounded-lg border border-card-border bg-card shadow-none">
                    <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} bg-muted/5`}>
                        <div className="flex min-w-0 items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Risk Assessment {riskIndex + 1}</p>
                        </div>
                        <div className="flex items-center gap-1.5 no-print">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(riskIndex)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Remove risk ${riskIndex + 1}`}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {hasPermission('risk-register-manage-definitions') && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void addToRiskRegister(riskIndex)}
                                    disabled={registeringRiskId !== null}
                                    className="h-7 gap-1.5 px-2 text-[9px] font-black uppercase tracking-widest"
                                >
                                    {registeringRiskId === riskId || registeredRiskIds.has(riskId) ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                        <BookPlus className="h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {registeringRiskId === riskId ? 'Adding...' : registeredRiskIds.has(riskId) ? 'In Register' : 'Add to Register'}
                                    </span>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <FormField
                                control={control}
                                name={`initialHazards.${hazardIndex}.description`}
                                render={({ field }) => (
                                    <FormItem className="rounded-lg border border-input bg-background px-3 py-3">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Hazard</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Name this hazard" {...field} className="mt-2 h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-1 focus-visible:ring-primary" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`initialHazards.${hazardIndex}.risks.${riskIndex}.description`}
                                render={({ field }) => (
                                    <FormItem className="rounded-lg border border-input bg-background px-3 py-3">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Risk</FormLabel>
                                        <FormControl>
                                            <textarea
                                                rows={1}
                                                placeholder="Describe the risk or outcome"
                                                {...field}
                                                ref={(element) => {
                                                    field.ref(element);
                                                    if (element) {
                                                        element.style.height = 'auto';
                                                        element.style.height = `${element.scrollHeight}px`;
                                                    }
                                                }}
                                                onChange={(event) => {
                                                    field.onChange(event);
                                                    event.currentTarget.style.height = 'auto';
                                                    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                                                }}
                                                className="mt-2 min-h-8 w-full resize-none overflow-hidden border-0 bg-transparent px-0 text-sm font-medium leading-5 shadow-none outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <RiskAssessmentEditor
                            path={`initialHazards.${hazardIndex}.risks.${riskIndex}.riskAssessment`}
                            label="Initial Risk"
                            riskMatrixColors={riskMatrixColors}
                            compact
                        />
                        <MitigationsArray
                            hazardIndex={hazardIndex}
                            riskIndex={riskIndex}
                            riskMatrixColors={riskMatrixColors}
                        />
                    </div>
                    </div>
                );
            })}
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ 
                    id: uuidv4(), 
                    description: '', 
                    riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' },
                    mitigations: [],
                })}
                className={`${HEADER_SECONDARY_BUTTON_CLASS} no-print`}
            >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Risk Impact
            </Button>
        </div>
    );
};

interface HazardIdentificationFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel?: Personnel[];
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
  onReportSaved?: (report: SafetyReport) => void;
}

export function HazardIdentificationForm({ report, tenantId, personnel = [], riskMatrixColors, isStacked = false, onReportSaved }: HazardIdentificationFormProps) {
  const { toast } = useToast();
  const activeRiskMatrixColors = riskMatrixColors;
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const normalizedHazards = React.useMemo(
    () => (report.initialHazards || []).map((hazard) => ({
      ...hazard,
      risks: (hazard.risks || []).map((risk) => ({
        ...risk,
        mitigations: (risk.mitigations || []).map((mitigation) => ({
          id: mitigation.id,
          description: mitigation.description || '',
          residualRiskAssessment: mitigation.residualRiskAssessment,
        })),
      })),
    })),
    [report.initialHazards]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(hazardIdentificationSchema),
    defaultValues: {
      initialHazards: normalizedHazards,
    },
  });

  React.useEffect(() => {
    form.reset({
      initialHazards: normalizedHazards,
    });
  }, [form, normalizedHazards]);

  const { fields: hazardFields, append: appendHazard } = useFieldArray({
    control: form.control,
    name: "initialHazards",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSaveError(null);
      const dataToSave = {
        initialHazards: values.initialHazards.map((hazard) => ({
          ...hazard,
          description: hazard.description?.trim() || '',
          risks: (hazard.risks || []).map((risk) => ({
            ...risk,
            description: risk.description?.trim() || '',
            mitigations: (risk.mitigations || []).map((mitigation) => ({
              id: mitigation.id,
              description: mitigation.description?.trim() || '',
              residualRiskAssessment: mitigation.residualRiskAssessment,
            })),
          })),
        })),
      };
      const correctiveActions = deriveCorrectiveActionsFromHazards(
        dataToSave.initialHazards as ReportHazard[],
        report.correctiveActions || [],
      );
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: { ...report, ...dataToSave, correctiveActions } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save hazard identification.');
      }
      const payload = await response.json().catch(() => null);
      if (payload?.report) {
        onReportSaved?.(payload.report as SafetyReport);
      }
      toast({ title: 'Hazard Identification Saved' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save hazard identification.';
      setSaveError(message);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: message,
      });
    }
  };

  const onInvalid = () => {
    const message = 'Some hazard fields are still invalid. Save drafts should still work, so this indicates a form-shape problem that needs attention.';
    setSaveError(message);
    toast({
      variant: 'destructive',
      title: 'Save blocked',
      description: message,
    });
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} bg-muted/5`}>
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight">Risk Assessment</h3>
          <p className="text-[10px] text-muted-foreground">Record each hazard, its associated risk, and the initial risk level.</p>
        </div>
        <Button type="button" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '', risks: [{ id: uuidv4(), description: '', riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] }] })} className={`${HEADER_SECONDARY_BUTTON_CLASS} no-print`}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
        </Button>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="h-full flex flex-col">
              {saveError ? (
                <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-destructive">Hazard Save Error</p>
                  <p className="mt-1 text-sm font-medium text-destructive">{saveError}</p>
                </div>
              ) : null}
              {isStacked ? (
                <div className="p-4">
                  <HazardFields report={report} hazardFields={hazardFields} riskMatrixColors={activeRiskMatrixColors} />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <HazardFields report={report} hazardFields={hazardFields} riskMatrixColors={activeRiskMatrixColors} />
                  </div>
                </ScrollArea>
              )}
              {!isStacked && (
                <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                    <Button type="submit" className={HEADER_ACTION_BUTTON_CLASS}>
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

function HazardFields({ report, hazardFields, riskMatrixColors }: { report: SafetyReport; hazardFields: Array<{ id: string }>; riskMatrixColors?: Record<string, string> }) {
  return (
    <>
      {hazardFields.map((field, index) => {
        return (
          <div key={field.id} className="space-y-3">
              <RisksArray report={report} hazardIndex={index} riskMatrixColors={riskMatrixColors} />
          </div>
      )})}
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
