
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
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, MocRisk, MocMitigation } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, ChevronDown, WandSparkles, Loader2, AlertTriangle, ShieldCheck, Zap, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect, useMemo } from 'react';
import { callAiFlow } from '@/lib/ai-client';
import type { AnalyzeMocInput, AnalyzeMocOutput } from '@/ai/flows/analyze-moc-flow';
import type { RiskMatrixSettings } from '@/types/risk';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

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

    const likelihoodLabels: Record<number, string> = {
        5: 'Frequent',
        4: 'Occasional',
        3: 'Remote',
        2: 'Improbable',
        1: 'Extremely Improbable',
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
        <div className="bg-muted/10 border border-slate-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller 
                    control={control} 
                    name={`${path}.likelihood`} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Likelihood: {value}</Label>
                                <span className="text-[10px] italic text-muted-foreground">({likelihoodLabels[value]})</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0 text-xs font-bold transition-all",
                                            value === num ? "bg-primary text-primary-foreground shadow-md scale-110" : "bg-background hover:bg-muted"
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
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Severity: {severityLabels[value]?.letter}</Label>
                                <span className="text-[10px] italic text-muted-foreground">({severityLabels[value]?.name})</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {[5, 4, 3, 2, 1].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0 text-xs font-bold transition-all",
                                            value === num ? "bg-primary text-primary-foreground shadow-md scale-110" : "bg-background hover:bg-muted"
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
        <div className='space-y-6 mt-4'>
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-primary/20"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">Mitigation Controls</p>
                <div className="h-px flex-1 bg-primary/20"></div>
            </div>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-6 border rounded-2xl bg-white border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel className="text-[10px] font-black uppercase">Action / Control</FormLabel><FormControl><Textarea placeholder='Describe mitigation...' {...field} className="min-h-[80px]" /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Assignee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.completionDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className="text-[10px] font-black uppercase">Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("h-10 pl-3 font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.status`} render={({ field }) => ( 
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem> 
                      )}/>
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(mitigationIndex)} className="h-10 w-10"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                   <div className="mt-6 border-t pt-4">
                      <RiskAssessmentEditor
                          path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`}
                          label="Residual Risk Assessment"
                          riskMatrixColors={riskMatrixColors}
                      />
                  </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })} className="w-full h-10 border-dashed border-2 hover:bg-muted/10">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Control Action
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
        <div className="space-y-10 mt-6">
            {fields.map((field, riskIndex) => (
                <div key={field.id} className="pb-10 border-b last:border-0">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="flex-1">
                            <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.description`} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-primary">Consequence / Risk Outcome</FormLabel>
                                    <FormControl><Input placeholder='Potential negative outcome...' {...field} className="font-bold border-none bg-muted/20 h-12" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => remove(riskIndex)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    
                    <RiskAssessmentEditor
                        path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.initialRiskAssessment`}
                        label="Initial Risk Assessment"
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
                className="text-primary hover:bg-primary/5 font-black uppercase text-[10px] gap-2"
            >
                <PlusCircle className="h-4 w-4" /> Add Potential Risk
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
        <div className="space-y-12 mt-8">
            {(fields || []).map((field, hazardIndex) => (
                <div key={field.id} className="p-8 border-2 border-slate-100 rounded-3xl bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-8 border-b pb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase text-amber-800/40">Hazard Identification</p>
                                <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.description`} render={({ field }) => ( 
                                    <FormItem className="flex-1">
                                        <FormControl><Input placeholder='Describe the hazard...' {...field} className="border-none bg-transparent shadow-none font-black text-xl p-0 h-auto focus-visible:ring-0" /></FormControl>
                                    </FormItem> 
                                )}/>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(hazardIndex)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <RisksArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                </div>
            ))}
             <Button type="button" variant="secondary" onClick={() => append({ id: uuidv4(), description: '', risks: [] })} className="w-full bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 border-amber-500/20 border-2 border-dashed gap-3 font-black uppercase text-[10px] h-12 rounded-2xl">
                <PlusCircle className="h-4 w-4" /> Identify New Hazard
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
        <div className="space-y-20 mt-8">
            {(fields || []).map((step, stepIndex) => (
                 <div key={step.id} className="relative">
                    <div className="flex items-center gap-6 border-b-4 border-slate-50 pb-6 mb-10">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">
                            {stepIndex + 1}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Implementation Step</p>
                            <FormField
                                control={control}
                                name={`phases.${phaseIndex}.steps.${stepIndex}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder="Describe action..." {...field} className="border-none shadow-none font-black text-2xl p-0 h-auto focus-visible:ring-0 tracking-tight" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <Button type="button" variant="ghost" size="icon" className="text-destructive h-12 w-12" onClick={() => remove(stepIndex)}><Trash2 className="h-5 w-5" /></Button>
                    </div>
                    
                    <div className="pl-0 lg:pl-16">
                        <HazardsArray phaseIndex={phaseIndex} stepIndex={stepIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                    </div>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
                className="w-full h-16 border-dashed border-4 font-black uppercase text-xs gap-3 tracking-widest rounded-3xl"
            >
                <PlusCircle className="h-6 w-6" /> Create New Step
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

export function ImplementationForm({ moc, tenantId, personnel }: ImplementationFormProps) {
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
      title: 'Implementation Plan Saved',
      description: 'Your changes are being saved in the background.',
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
        toast({ title: 'AI Analysis Complete' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-20 max-w-[1200px] mx-auto pb-40" key={formKey}>
           <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/5 border p-6 rounded-3xl no-print gap-4">
              <div className="space-y-1">
                  <h3 className="text-base font-black uppercase tracking-tight">Implementation Strategy</h3>
                  <p className="text-xs text-muted-foreground font-medium">Map phases, identify hazards, and conduct risk assessments.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button type="button" variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1 h-11 px-6 text-[11px] font-black uppercase gap-2 border-slate-300">
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4 text-primary" />}
                    AI Analyze
                </Button>
                <Button type="button" variant="default" size="sm" onClick={() => appendPhase({ id: uuidv4(), title: '', steps: [] })} className="flex-1 h-11 px-8 text-[11px] font-black uppercase gap-2 bg-emerald-700 hover:bg-emerald-800">
                    <PlusCircle className="h-4 w-4" /> Add Phase
                </Button>
              </div>
          </div>

          <div className="space-y-40">
            {phaseFields.map((field, index) => (
                <div key={field.id} className="relative">
                    <div className="flex items-center justify-between border-b-8 border-emerald-700/10 pb-6 mb-12">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-xl shrink-0">
                                <Zap className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase text-emerald-800/40">Core Phase</p>
                                <FormField
                                    control={form.control}
                                    name={`phases.${index}.title`}
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                        <Input className="text-4xl font-black border-none shadow-none p-0 focus-visible:ring-0 uppercase tracking-tighter" placeholder="Phase Title..." {...field} />
                                        </FormControl>
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => removePhase(index)} className="text-destructive font-black uppercase text-[10px] h-9 px-4 no-print ml-4 border-slate-200">
                            Delete Phase
                        </Button>
                    </div>

                    <StepsArray phaseIndex={index} personnel={personnel} riskMatrixColors={riskMatrixSettings?.colors} />
                </div>
            ))}
          </div>

          <div className="fixed bottom-8 right-8 z-50 no-print flex gap-4">
             <Button type="submit" size="lg" className="h-16 px-12 shadow-[0_20px_50px_rgba(16,185,129,0.3)] rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase tracking-tight gap-3 text-lg border-4 border-white/20">
                <ShieldCheck className="h-7 w-7" /> Save Implementation Strategy
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
