'use client';

import { useForm, useFieldArray, useWatch, Controller, useFormContext, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, MocRisk, MocMitigation } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { PlusCircle, Trash2, CalendarIcon, ChevronDown, WandSparkles, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import { analyzeMoc, type AnalyzeMocInput } from '@/ai/flows/analyze-moc-flow';

// --- Zod Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const mitigationSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Mitigation description is required."),
    responsiblePersonId: z.string().min(1, "Assignee is required."),
    completionDate: z.date(),
    status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']),
    residualRiskAssessment: riskAssessmentSchema.optional(),
});

const riskSchema: z.ZodType<MocRisk> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().min(1, "Risk description is required"),
    initialRiskAssessment: riskAssessmentSchema.optional(),
    mitigations: z.array(mitigationSchema),
}));

const hazardSchema: z.ZodType<MocHazard> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().min(1, 'Hazard description is required.'),
    risks: z.array(riskSchema),
}));

const stepSchema = z.object({
    id: z.string(),
    description: z.string(),
    hazards: z.array(hazardSchema),
});

const phaseSchema = z.object({
    id: z.string(),
    title: z.string(),
    steps: z.array(stepSchema),
});

const formSchema = z.object({
    phases: z.array(phaseSchema),
});

type FormValues = z.infer<typeof formSchema>;


// --- Helper Functions to map dates for form and Firestore ---
const mapDatesToObjects = (phases: MocPhase[]): FormValues['phases'] => {
    return (phases || []).map(phase => ({
        ...phase,
        steps: (phase.steps || []).map(step => ({
            ...step,
            hazards: (step.hazards || []).map(hazard => ({
                ...hazard,
                risks: (hazard.risks || []).map(risk => ({
                    ...risk,
                    mitigations: (risk.mitigations || []).map(mitigation => ({
                        ...mitigation,
                        completionDate: mitigation.completionDate ? new Date(mitigation.completionDate) : new Date(),
                    })),
                })),
            })),
        })),
    }));
};

const mapDatesToStrings = (phases: FormValues['phases']): MocPhase[] => {
    return phases.map(phase => ({
        ...phase,
        steps: phase.steps.map(step => ({
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

// --- Risk Assessment Component ---
const getRiskScoreColorClass = (score: number) => {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500 text-black';
    if (score <= 16) return 'bg-orange-500';
    return 'bg-red-500';
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
}

const RiskAssessmentEditor: React.FC<RiskAssessmentEditorProps> = ({ path, label }) => {
    const { control, setValue, watch } = useFormContext();
    const likelihood = watch(`${path}.likelihood`, 1);
    const severity = watch(`${path}.severity`, 1);
    const riskScore = likelihood * severity;
    const riskLevel = getRiskLevel(riskScore);
    const colorClass = getRiskScoreColorClass(riskScore);

    React.useEffect(() => {
        setValue(`${path}.riskScore`, riskScore, { shouldDirty: true });
        setValue(`${path}.riskLevel`, riskLevel, { shouldDirty: true });
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <Card className="bg-background">
            <CardHeader className="pb-4">
                <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                    <Controller control={control} name={`${path}.likelihood`} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel>Likelihood: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem> )} />
                    <Controller control={control} name={`${path}.severity`} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel>Severity: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem> )}/>
                </div>
                <div className="flex justify-center items-center">
                    <div className={cn("flex items-center justify-center h-12 w-12 rounded-full text-white text-lg font-bold", colorClass)}>
                        {riskScore}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

const MitigationsArray = ({ phaseIndex, stepIndex, hazardIndex, riskIndex, personnel }: { phaseIndex: number, stepIndex: number, hazardIndex: number, riskIndex: number, personnel: Personnel[] }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations`,
    });

    return (
        <div className='pl-6 mt-4 space-y-3'>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-4 border rounded-md bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Mitigation</FormLabel><FormControl><Textarea placeholder='Describe the mitigation...' {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.completionDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.status`} render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(mitigationIndex)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                   <div className="mt-4">
                      <RiskAssessmentEditor
                          path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`}
                          label="Residual Risk Assessment"
                      />
                  </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}><PlusCircle className="mr-2 h-4 w-4" />Add Mitigation</Button>
        </div>
    )
}

const RisksArray = ({ phaseIndex, stepIndex, hazardIndex, personnel }: { phaseIndex: number, stepIndex: number, hazardIndex: number, personnel: Personnel[] }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks`,
    });

    return (
        <div className="pl-6 mt-4 space-y-4 border-l">
            {fields.map((field, riskIndex) => (
                <Collapsible key={field.id} asChild defaultOpen>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
                             <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Risk Description</FormLabel><FormControl><Input placeholder='Describe the risk...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="flex items-center gap-1">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="[&[data-state=open]>svg]:rotate-180">
                                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                        <span className="sr-only">Toggle Risk Details</span>
                                    </Button>
                                </CollapsibleTrigger>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(riskIndex)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="pt-4 space-y-4">
                                <RiskAssessmentEditor
                                    path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.initialRiskAssessment`}
                                    label="Initial Risk Assessment"
                                />
                                <h4 className="font-semibold text-sm pt-4 border-t">Mitigations</h4>
                                <MitigationsArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} riskIndex={riskIndex} personnel={personnel} />
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Risk
            </Button>
        </div>
    )
}
  
const HazardsArray = ({ phaseIndex, stepIndex, personnel }: { phaseIndex: number, stepIndex: number, personnel: Personnel[] }) => {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards`,
    });

    const addHazard = () => {
        append({ id: uuidv4(), description: '', risks: [] });
    }

    return (
        <div className="pl-6 mt-4 space-y-4">
            {fields.map((field, hazardIndex) => (
                <Collapsible key={field.id} asChild defaultOpen>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
                            <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Hazard Description</FormLabel><FormControl><Input placeholder='Describe the hazard...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(hazardIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                           <h4 className="font-semibold text-sm">Identified Risks</h4>
                           <RisksArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} personnel={personnel} />
                        </CardContent>
                    </Card>
                </Collapsible>
            ))}
             <Button type="button" variant="secondary" onClick={addHazard}><PlusCircle className="mr-2 h-4 w-4" /> Add Hazard</Button>
        </div>
    )
}

// --- Main Component ---
interface HazardAnalysisFormProps {
  moc: ManagementOfChange;
  tenantId: string;
  personnel: Personnel[];
}

export function HazardAnalysisForm({ moc, tenantId, personnel }: HazardAnalysisFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phases: mapDatesToObjects(moc.phases || []),
    },
  });

  const { fields: phaseFields } = useFieldArray({
    control: form.control,
    name: 'phases',
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const mocRef = doc(firestore, `tenants/${tenantId}/management-of-change`, moc.id);
    const dataToSave = { phases: mapDatesToStrings(values.phases) };
    updateDocumentNonBlocking(mocRef, dataToSave);
    toast({
      title: 'Hazard Analysis Saved',
    });
  };
  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
        const mocData: AnalyzeMocInput = {
            title: moc.title,
            description: moc.description,
            reason: moc.reason,
            scope: moc.scope,
        };
        const result = await analyzeMoc(mocData);

        const newPhases = result.phases.map(phase => ({
            ...phase,
            steps: (phase.steps || []).map(step => ({
                ...step,
                hazards: (step.hazards || []).map(hazard => ({
                    ...hazard,
                    risks: (hazard.risks || []).map(risk => ({
                        ...risk,
                        initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' },
                        mitigations: [],
                    })),
                })),
            })),
        }));

        form.setValue('phases', mapDatesToObjects(newPhases), { shouldValidate: true });
        toast({ title: 'AI Analysis Complete', description: 'A draft implementation plan and hazard analysis has been generated.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
    } finally {
        setIsAnalyzing(false);
    }
};


  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              Analyze with AI
            </Button>
          </div>
          <div className="space-y-4">
            {(phaseFields || []).map((phase, phaseIndex) => (
              <div key={phase.id} className="border-b last:border-0 pb-4">
                  <h3 className="text-lg font-semibold">{phase.title}</h3>
                  {(phase.steps || []).map((step, stepIndex) => (
                      <div key={step.id} className="py-2 pl-4">
                          <p className="font-medium">{stepIndex + 1}. {step.description}</p>
                          <HazardsArray phaseIndex={phaseIndex} stepIndex={stepIndex} personnel={personnel} />
                      </div>
                  ))}
              </div>
            ))}
          </div>
          {phaseFields.length === 0 && (
              <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                  <p>No implementation plan defined.</p>
                  <p className="text-sm">Go to the &quot;Implementation Plan&quot; tab to define phases and steps, or use the AI analyzer.</p>
              </div>
          )}
          <div className="flex justify-end pt-4">
            <Button type="submit">Save Hazard Analysis</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
