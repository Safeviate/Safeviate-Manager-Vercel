
'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext } from 'react-hook-form';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect, useMemo } from 'react';
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

// --- Risk Assessment Component ---
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
    const severityToLetter: { [key: number]: string } = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const severityLetter = severityToLetter[severity] || 'E';
    const cellId = `${likelihood}${severityLetter}`;
    
    if (colors && colors[cellId]) {
        // Simple contrast check for custom colors
        const hex = colors[cellId].replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? 'black' : 'white';
        return { backgroundColor: colors[cellId], color: textColor };
    }
    
    // Fallback to old logic
    const score = likelihood * severity;
    if (score > 9) return { backgroundColor: '#d9534f', color: 'white' };
    if (score > 4) return { backgroundColor: '#f0ad4e', color: 'black' };
    return { backgroundColor: '#5cb85c', color: 'white' };
  };

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
    const { backgroundColor, color } = getRiskScoreColor(likelihood, severity, riskMatrixColors);

    React.useEffect(() => {
        setValue(`${path}.riskScore`, riskScore, { shouldDirty: true });
        setValue(`${path}.riskLevel`, riskLevel, { shouldDirty: true });
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <Card className="bg-background">
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-4 gap-y-2 items-center">
                <div className="space-y-3">
                    <Controller control={control} name={`${path}.likelihood`} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel className="text-xs">Likelihood: {value}</FormLabel><FormControl><div className="no-print"><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></div></FormControl></FormItem> )} />
                    <Controller control={control} name={`${path}.severity`} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel className="text-xs">Severity: {value}</FormLabel><FormControl><div className="no-print"><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></div></FormControl></FormItem> )}/>
                </div>
                <div className="flex justify-center items-center">
                    <div
                        className="flex items-center justify-center h-10 w-10 rounded-full text-base font-bold"
                        style={{ backgroundColor, color }}
                    >
                        {riskScore}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

const MitigationsArray = ({ phaseIndex, stepIndex, hazardIndex, riskIndex, personnel, riskMatrixColors }: { phaseIndex: number, stepIndex: number, hazardIndex: number, riskIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
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
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(mitigationIndex)} className="no-print"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                   <div className="mt-4">
                      <RiskAssessmentEditor
                          path={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`}
                          label="Residual Risk Assessment"
                          riskMatrixColors={riskMatrixColors}
                      />
                  </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open', residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })} className="no-print"><PlusCircle className="mr-2 h-4 w-4" />Add Mitigation</Button>
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
        <div className="pl-6 mt-4 space-y-4 border-l">
            {fields.map((field, riskIndex) => (
                <Collapsible key={field.id} asChild defaultOpen>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
                             <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Risk Description</FormLabel><FormControl><Input placeholder='Describe the risk...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="flex items-center gap-1 no-print">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="[&[data-state=open]>svg]:-rotate-180">
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
                                    riskMatrixColors={riskMatrixColors}
                                />
                                <h4 className="font-semibold text-sm pt-4 border-t">Mitigations</h4>
                                <MitigationsArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} riskIndex={riskIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
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
                className="no-print"
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Risk
            </Button>
        </div>
    )
}
  
const HazardsArray = ({ phaseIndex, stepIndex, personnel, riskMatrixColors }: { phaseIndex: number, stepIndex: number, personnel: Personnel[], riskMatrixColors?: Record<string, string> }) => {
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
            {(fields || []).map((field, hazardIndex) => (
                <Collapsible key={field.id} asChild defaultOpen>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
                            <FormField control={control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Hazard Description</FormLabel><FormControl><Input placeholder='Describe the hazard...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive no-print" onClick={() => remove(hazardIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                           <h4 className="font-semibold text-sm">Identified Risks</h4>
                           <RisksArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                        </CardContent>
                    </Card>
                </Collapsible>
            ))}
             <Button type="button" variant="secondary" onClick={addHazard} className="no-print"><PlusCircle className="mr-2 h-4 w-4" /> Add Hazard</Button>
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
        <div className="space-y-4 pt-4">
            {(fields || []).map((step, stepIndex) => (
                 <Collapsible key={step.id} defaultOpen className="ml-4 border-l-2 border-slate-200 pl-4 py-2">
                    <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild className="no-print">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                            </Button>
                        </CollapsibleTrigger>
                        <FormField
                            control={control}
                            name={`phases.${phaseIndex}.steps.${stepIndex}.description`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder="Describe the step..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="button" variant="ghost" size="icon" className="text-destructive no-print" onClick={() => remove(stepIndex)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <CollapsibleContent>
                        <div className="pt-4">
                            <HazardsArray phaseIndex={phaseIndex} stepIndex={stepIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
            <div className="pl-4">
                <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
                className="no-print"
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                </Button>
            </div>
        </div>
    );
};


// --- Main Component ---
interface ImplementationFormProps {
  moc: ManagementOfChange;
  tenantId: string;
  personnel: Personnel[];
  riskMatrixColors?: Record<string, string>;
}

export function ImplementationForm({ moc, tenantId, personnel, riskMatrixColors }: ImplementationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const formKey = useMemo(() => moc.id || uuidv4(), [moc.id]);

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
        const result = await analyzeMoc(mocData);

        const phasesWithDateObjects = mapDatesToObjects(result.phases);
        form.reset({ phases: phasesWithDateObjects });

        toast({ title: 'AI Analysis Complete', description: 'The implementation plan has been populated. Review and save the changes.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" key={formKey}>
           <div className="flex justify-end gap-2 no-print">
              <Button type="button" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                Analyze with AI
              </Button>
              <Button type="button" variant="outline" onClick={() => appendPhase({ id: uuidv4(), title: '', steps: [] })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
              </Button>
          </div>
          <div className="space-y-6">
            {phaseFields.map((field, index) => (
              <Collapsible key={field.id} defaultOpen>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                            <CollapsibleTrigger asChild className="no-print">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                                </Button>
                            </CollapsibleTrigger>
                            <FormField
                                control={form.control}
                                name={`phases.${index}.title`}
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                    <Input className="text-lg font-semibold border-none shadow-none p-0 focus-visible:ring-0" placeholder="Phase Title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removePhase(index)} className="no-print">
                            Delete Phase
                        </Button>
                    </CardHeader>
                    <CollapsibleContent>
                       <div className="p-4 pt-0">
                          <StepsArray phaseIndex={index} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                       </div>
                    </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
            {phaseFields.length === 0 && (
              <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                  <p>No implementation phases defined.</p>
                  <p className="text-sm">Click "Add Phase" to get started or use the AI analyzer.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 no-print">
            <Button type="submit">Save Plan &amp; Analysis</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
