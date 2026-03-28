'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, MocRisk } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, AlertTriangle, Zap, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { callAiFlow } from '@/lib/ai-client';
import type { AnalyzeMocInput, AnalyzeMocOutput } from '@/ai/flows/analyze-moc-flow';
import type { RiskMatrixSettings } from '@/types/risk';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

// --- Zod Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const mitigationSchema = z.object({
    id: z.string(),
    description: z.string().optional(),
    responsiblePersonId: z.string().optional(),
    completionDate: z.date(),
    status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']),
    residualRiskAssessment: riskAssessmentSchema.optional(),
});

const riskSchema: z.ZodType<Omit<MocRisk, 'mitigations' | 'initialRiskAssessment'> & { mitigations?: z.infer<typeof mitigationSchema>[], initialRiskAssessment?: z.infer<typeof riskAssessmentSchema> }> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().optional(),
    initialRiskAssessment: riskAssessmentSchema.optional(),
    mitigations: z.array(mitigationSchema).optional(),
}));

const hazardSchema: z.ZodType<Omit<MocHazard, 'risks'> & { risks?: z.infer<typeof riskSchema>[] }> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().optional(),
    risks: z.array(riskSchema).optional(),
}));

const stepSchema = z.object({
    id: z.string(),
    description: z.string().optional(),
    hazards: z.array(hazardSchema).optional(),
});

const phaseSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  steps: z.array(stepSchema).optional(),
});

const formSchema = z.object({
    phases: z.array(phaseSchema),
});

type FormValues = z.infer<typeof formSchema>;


// --- Helper Functions ---
const mapDatesToObjects = (phases: MocPhase[]): FormValues['phases'] => {
    const defaultRiskAssessment = { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' as const };
    return (phases || []).map(phase => ({
        ...phase,
        steps: (phase.steps || []).map(step => ({
            ...step,
            hazards: (step.hazards || []).map(hazard => ({
                ...hazard,
                risks: (hazard.risks || []).map(risk => ({
                    ...risk,
                    initialRiskAssessment: risk.initialRiskAssessment || { ...defaultRiskAssessment },
                    mitigations: (risk.mitigations || []).map(mitigation => ({
                        ...mitigation,
                        completionDate: mitigation.completionDate ? new Date(mitigation.completionDate) : new Date(),
                        residualRiskAssessment: mitigation.residualRiskAssessment || { ...defaultRiskAssessment },
                    })),
                })),
            })),
        })),
    }));
};

const mapDatesToStrings = (phases: FormValues['phases']): MocPhase[] => {
    return phases.map(phase => ({
        ...phase,
        steps: (phase.steps || []).map(step => ({
            ...step,
            hazards: (step.hazards || []).map(hazard => ({
                ...hazard,
                risks: (hazard.risks || []).map(risk => ({
                    ...risk,
                    mitigations: (risk.mitigations || []).map(mitigation => ({
                        ...mitigation,
                        completionDate: mitigation.completionDate.toISOString(),
                    })),
                })),
            })),
        })),
    }));
};

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

const CompactRow = ({ label, children, actions }: { label: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b last:border-b-0 hover:bg-muted/5 transition-colors">
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{label}</p>
            <div className="w-full">{children}</div>
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
);

interface RiskAssessmentEditorProps {
    path: string;
    label: string;
    riskMatrixColors?: Record<string, string>;
}

const RiskAssessmentEditor: React.FC<RiskAssessmentEditorProps> = ({ path, label, riskMatrixColors }) => {
    const { control, setValue, watch } = useFormContext();

    const likelihood = watch(`${path}.likelihood`, 1);
    const severity = watch(`${path}.severity`, 1);
    
    const riskScore = (likelihood || 1) * (severity || 1);
    const riskLevel = getRiskLevel(riskScore);
    const riskColors = getRiskScoreColor(likelihood, severity, riskMatrixColors);

    const likelihoodLabels: Record<number, string> = {
        5: 'Frequent',
        4: 'Occasional',
        3: 'Remote',
        2: 'Improbable',
        1: 'Ext. Improbable',
    };
    
    const severityLabels: Record<number, { name: string; letter: string }> = {
        5: { name: 'Catastrophic', letter: 'A' },
        4: { name: 'Hazardous', letter: 'B' },
        3: { name: 'Major', letter: 'C' },
        2: { name: 'Minor', letter: 'D' },
        1: { name: 'Negligible', letter: 'E' },
    };

    React.useEffect(() => {
        setValue(`${path}.riskScore`, riskScore, { shouldDirty: true });
        setValue(`${path}.riskLevel`, riskLevel, { shouldDirty: true });
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <div 
            className="border border-slate-200 rounded-xl p-4 transition-colors"
            style={{ backgroundColor: riskColors.backgroundColor, color: riskColors.color }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 opacity-70" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</h5>
                </div>
                <Badge variant="outline" className="h-6 font-black text-[10px] border-white/20 bg-white/10 text-inherit">
                    {likelihood}{severityLabels[severity]?.letter} — {riskLevel}
                </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <Controller 
                    control={control} 
                    name={`${path}.likelihood`} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-0 sm:min-w-[180px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Likelihood:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{likelihoodLabels[value]}</span>
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
                    name={`${path}.severity`} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-0 sm:min-w-[180px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Severity:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{severityLabels[value]?.name}</span>
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
}

const MitigationsArray = ({ phaseIndex, stepIndex, hazardIndex, riskIndex, personnel, riskMatrixColors }: { phaseIndex: number, stepIndex: number, hazardIndex: number, riskIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations`,
    });

    return (
        <div className='space-y-4 mt-4'>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mitigation Controls</p>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-4 border rounded-xl bg-background border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel className="text-[9px] font-black uppercase opacity-60">Action Detail</FormLabel><FormControl><Input placeholder='Mitigation action...' {...field} className="h-9 text-sm font-bold" /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase opacity-60">Assignee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.completionDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="text-[9px] font-black uppercase opacity-60">Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("h-9 pl-3 font-bold text-xs", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd MMM yyyy") : <span>Date</span>}<CalendarIcon className="ml-auto h-3 w-3 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.status`} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase opacity-60">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(mitigationIndex)} className="h-9 w-9 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                   <div className="mt-4 border-t pt-4">
                      <RiskAssessmentEditor
                          path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`}
                          label="Residual Risk"
                          riskMatrixColors={riskMatrixColors}
                      />
                  </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })} className="w-full h-9 border-dashed font-black uppercase text-[9px] tracking-widest">
                <PlusCircle className="mr-2 h-3 w-3" /> Add Mitigation Control
            </Button>
        </div>
    )
}

const RisksArray = ({ phaseIndex, stepIndex, hazardIndex, personnel, riskMatrixColors }: { phaseIndex: number, stepIndex: number, hazardIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks`,
    });

    return (
        <div className="space-y-6 mt-4">
            {fields.map((field, riskIndex) => (
                <div key={field.id} className="p-4 border-l-4 border-primary rounded-r-xl bg-muted/10">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-1">
                            <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.description`} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-primary">Risk Outcome / Consequence</FormLabel>
                                    <FormControl><Input placeholder='Describe outcome...' {...field} className="font-bold border-none bg-background h-10 shadow-none focus-visible:ring-0" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => remove(riskIndex)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    
                    <RiskAssessmentEditor
                        path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.initialRiskAssessment`}
                        label="Initial Risk"
                        riskMatrixColors={riskMatrixColors}
                    />
                    <MitigationsArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} riskIndex={riskIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                </div>
            ))}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}
                className="text-primary font-black uppercase text-[10px] h-8"
            >
                <PlusCircle className="mr-2 h-3.5 w-3.5" /> Define Potential Risk
            </Button>
        </div>
    )
}
  
const HazardsArray = ({ phaseIndex, stepIndex, personnel, riskMatrixColors }: { phaseIndex: number, stepIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards`,
    });

    return (
        <div className="space-y-6 mt-4">
            {(fields || []).map((field, hazardIndex) => (
                <div key={field.id} className="p-4 border rounded-xl bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="flex-1">
                                <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.description`} render={({ field }) => ( 
                                    <FormItem className="flex-1">
                                        <FormControl><Input placeholder='Hazard identification...' {...field} className="border-none bg-transparent shadow-none font-black text-sm p-0 h-auto focus-visible:ring-0 uppercase tracking-tight" /></FormControl>
                                    </FormItem> 
                                )}/>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(hazardIndex)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <RisksArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                </div>
            ))}
             <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), description: '', risks: [] })} className="w-full bg-amber-500/5 text-amber-700 border-amber-500/20 border-dashed gap-2 font-black uppercase text-[9px] h-9">
                <PlusCircle className="h-3.3 w-3" /> Identify New Hazard
             </Button>
        </div>
    )
}


const StepsArray = ({ phaseIndex, personnel, riskMatrixColors }: { phaseIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({
      control,
      name: `phases.${phaseIndex}.steps`,
    });
  
    return (
        <div className="space-y-4">
            {(fields || []).map((step, stepIndex) => (
                 <Collapsible key={step.id} defaultOpen>
                    <div className="border rounded-xl bg-muted/5 overflow-hidden">
                        <div className="flex items-center justify-between bg-white/50 border-b">
                            <div className="flex-1 min-w-0">
                                <CompactRow 
                                    label="Implementation Step"
                                    actions={
                                        <div className="flex items-center gap-1">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" /></Button>
                                            </CollapsibleTrigger>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(stepIndex)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-black text-[10px] border-slate-300">
                                            {stepIndex + 1}
                                        </Badge>
                                        <FormField
                                            control={control}
                                            name={`phases.${phaseIndex}.steps.${stepIndex}.description`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Describe action..." {...field} className="border-none shadow-none font-bold text-sm p-0 h-auto focus-visible:ring-0" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CompactRow>
                            </div>
                        </div>
                        
                        <CollapsibleContent>
                            <div className="p-4">
                                <HazardsArray phaseIndex={phaseIndex} stepIndex={stepIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            ))}
            <Button
                type="button"
                variant="outline"
                onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
                className="w-full h-10 border-dashed border-2 font-black uppercase text-[10px] gap-2 tracking-widest"
            >
                <PlusCircle className="h-4 w-4" /> Add Execution Step
            </Button>
        </div>
    );
};


// --- Main Component ---
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const formKey = useMemo(() => moc.id || uuidv4(), [moc.id]);

  const riskMatrixRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-matrix-config') : null), [firestore, tenantId]);
  const { data: riskMatrixSettings } = useDoc<RiskMatrixSettings>(riskMatrixRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({ phases: mapDatesToObjects(moc.phases || []) }), [moc]),
  });

  const { fields: phaseFields, append: appendPhase, remove: removePhase } = useFieldArray({
    control: form.control,
    name: 'phases',
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const mocRef = doc(firestore, 'tenants', tenantId, 'management-of-change', moc.id);
    const dataToSave = { phases: mapDatesToStrings(values.phases) };
    updateDocumentNonBlocking(mocRef, dataToSave);
    toast({
      title: 'Strategy Saved',
      description: 'The implementation plan has been synchronized.',
    });
  };
  
  const handleAnalyze = async () => {
    if (!firestore) return;
    setIsAnalyzing(true);
    try {
        const mocData: AnalyzeMocInput = {
            title: moc.title,
            description: moc.description,
            reason: moc.reason,
            scope: moc.scope,
        };
        const result = await callAiFlow<AnalyzeMocInput, AnalyzeMocOutput>('analyzeMoc', mocData);
        const phasesWithDateObjects = mapDatesToObjects(result.phases);
        form.reset({ phases: phasesWithDateObjects });
        toast({ title: 'AI Insights Applied' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
    } finally {
        setIsAnalyzing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit(onSubmit)(),
    analyze: handleAnalyze,
    addPhase: () => appendPhase({ id: uuidv4(), title: '', steps: [] })
  }));
  
  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10" key={formKey}>
           <Card className="shadow-none border rounded-xl overflow-hidden">
                <MainPageHeader 
                    title="Implementation Strategy"
                />
                <CardContent className="p-0 bg-background">
                    {/* --- CONSOLIDATED METADATA ROWS --- */}
                    <div className="bg-muted/10 border-b">
                        <CompactRow label="DETAILED DESCRIPTION">
                            <p className="text-sm font-medium leading-relaxed">{moc.description}</p>
                        </CompactRow>
                        <CompactRow label="REASON FOR CHANGE">
                            <p className="text-sm font-medium leading-relaxed">{moc.reason}</p>
                        </CompactRow>
                        <CompactRow label="SCOPE OF CHANGE">
                            <p className="text-sm font-medium leading-relaxed">{moc.scope}</p>
                        </CompactRow>
                    </div>

                    {phaseFields.length > 0 ? (
                        <div className="space-y-10 p-6">
                            {phaseFields.map((field, index) => (
                                <Collapsible key={field.id} defaultOpen>
                                    <div className="space-y-4">
                                        <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <CompactRow 
                                                        label="CORE PHASE"
                                                        actions={
                                                            <div className="flex items-center gap-1">
                                                                <CollapsibleTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" /></Button>
                                                                </CollapsibleTrigger>
                                                                <Button type="button" variant="outline" size="sm" onClick={() => removePhase(index)} className="text-destructive h-8 border-slate-200 text-[9px] font-black uppercase">Remove Phase</Button>
                                                            </div>
                                                        }
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-sm shrink-0">
                                                                <Zap className="h-4 w-4" />
                                                            </div>
                                                            <FormField
                                                                control={form.control}
                                                                name={`phases.${index}.title`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex-1">
                                                                        <FormControl>
                                                                            <Input className="text-xl font-black border-none shadow-none p-0 focus-visible:ring-0 uppercase tracking-tighter h-auto" placeholder="Phase Title..." {...field} />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </CompactRow>
                                                </div>
                                            </div>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="px-0">
                                                <StepsArray phaseIndex={index} personnel={personnel} riskMatrixColors={riskMatrixSettings?.colors} />
                                            </div>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest opacity-40">
                            No strategy phases defined.
                        </div>
                    )}
                </CardContent>
           </Card>
        </form>
      </Form>
    </FormProvider>
  );
});

ImplementationForm.displayName = 'ImplementationForm';