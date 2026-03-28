'use client';

import { useForm, useFieldArray, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Risk, RiskItem, Mitigation, RiskMatrixSettings, RiskRegisterSettings } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlusCircle, Trash2, ChevronDown, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';

const DEFAULT_HAZARD_AREAS = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

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
    reviewDate: z.date(),
    residualRiskAssessment: riskAssessmentSchema.optional(),
});

const riskItemSchema: z.ZodType<Omit<RiskItem, 'mitigations'> & { mitigations: z.infer<typeof mitigationSchema>[] }> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().min(1, "Risk description is required"),
    initialRiskAssessment: riskAssessmentSchema.optional(),
    mitigations: z.array(mitigationSchema),
}));

const formSchema = z.object({
  hazardArea: z.string().min(1, 'Hazard area is required.'),
  hazard: z.string().min(1, 'Hazard description is required.'),
  risks: z.array(riskItemSchema).min(1, "At least one risk must be added."),
});

export type RiskFormValues = z.infer<typeof formSchema>;

// --- Helper to map dates for form state ---
const mapDatesToObjects = (risk?: Risk | null): RiskFormValues => {
    if (!risk) {
        return {
            hazardArea: '',
            hazard: '',
            risks: [],
        };
    }
    return {
        hazardArea: risk.hazardArea,
        hazard: risk.hazard,
        risks: (risk.risks || []).map(r => ({
            ...r,
            mitigations: (r.mitigations || []).map(m => ({
                ...m,
                reviewDate: m.reviewDate ? new Date(m.reviewDate) : new Date(),
            }))
        }))
    };
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

// --- Risk Assessment Component ---
const RiskAssessmentEditor: React.FC<{ path: string; label: string; riskMatrixColors?: Record<string, string> }> = ({ path, label, riskMatrixColors }) => {
    const { control, setValue, watch } = useFormContext<RiskFormValues>();
    const likelihood = watch(`${path}.likelihood` as any, 1);
    const severity = watch(`${path}.severity` as any, 1);
    
    const riskScore = (likelihood || 1) * (severity || 1);
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
                    <ShieldAlert className="h-3.5 w-3.5 opacity-70" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</h5>
                </div>
                <Badge variant="outline" className="h-6 font-black text-[10px] border-white/20 bg-white/10 text-inherit">
                    {likelihood}{severityLabels[severity]?.letter} — {riskLevel}
                </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Controller 
                    control={control} 
                    name={`${path}.likelihood` as any} 
                    render={({ field: { onChange, value } }) => ( 
                        <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-[140px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Likelihood:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{likelihoodLabels[value]}</span>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 text-xs font-bold transition-all",
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
                        <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-1.5 min-w-[140px]">
                                <Label className="text-[10px] uppercase font-black opacity-70 whitespace-nowrap">Severity:</Label>
                                <span className="text-[10px] font-black uppercase truncate">{severityLabels[value]?.name}</span>
                            </div>
                            <div className="flex gap-1">
                                {[5, 4, 3, 2, 1].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant={value === num ? "default" : "outline"}
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 text-xs font-bold transition-all",
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

// --- Nested Field Arrays ---

const MitigationsArray = ({ riskIndex, personnel, riskMatrixColors }: { riskIndex: number; personnel: Personnel[]; riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext<RiskFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `risks.${riskIndex}.mitigations` });

    return (
        <div className='pl-6 mt-4 space-y-4'>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-4 border rounded-md bg-background shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Mitigation Action</FormLabel><FormControl><Textarea placeholder='Describe the mitigation...' {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.reviewDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Review Date</Label><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(mitigationIndex)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  </div>
                  <div className="mt-4"><RiskAssessmentEditor path={`risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`} label="Residual Risk Assessment" riskMatrixColors={riskMatrixColors} /></div>
                </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', reviewDate: new Date(), residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}><PlusCircle className="mr-2 h-4 w-4" />Add Mitigation</Button>
        </div>
    )
}

const RisksArray = ({ personnel, riskMatrixColors }: { personnel: Personnel[]; riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext<RiskFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `risks` });

    return (
        <div className="space-y-4">
            {fields.map((field, riskIndex) => (
                <Collapsible key={field.id} defaultOpen>
                    <Card className="bg-muted/30 border-none shadow-none">
                        <CardHeader className="flex flex-row items-center p-4 bg-muted/20">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 [&[data-state=open]>svg]:rotate-180">
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                </Button>
                            </CollapsibleTrigger>
                            <div className="flex-1">
                                <FormField control={control} name={`risks.${riskIndex}.description`} render={({ field }) => ( <FormItem><FormLabel className="sr-only">Risk</FormLabel><FormControl><Input placeholder='Describe the potential risk outcome...' {...field} className="bg-background" /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive ml-2" onClick={() => remove(riskIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="space-y-4 p-4 pt-6">
                                <RiskAssessmentEditor path={`risks.${riskIndex}.initialRiskAssessment`} label="Initial Risk Assessment" riskMatrixColors={riskMatrixColors} />
                                <h4 className="font-bold text-xs uppercase text-muted-foreground pt-4 border-t tracking-widest">Mitigations & Actions</h4>
                                <MitigationsArray riskIndex={riskIndex} personnel={personnel} riskMatrixColors={riskMatrixColors} />
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}
            <Button type="button" variant="outline" className="w-full h-12 border-dashed" onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}><PlusCircle className="mr-2 h-4 w-4" />Add Risk Potential</Button>
        </div>
    )
}


// --- Main Form Component ---
interface RiskFormProps {
  existingRisk?: Risk | null;
  personnel: Personnel[];
  onCancel?: () => void;
  hideHeader?: boolean;
}

export function RiskForm({ existingRisk, personnel, onCancel, hideHeader = false }: RiskFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();

  const riskMatrixRef = useMemoFirebase(() => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-matrix-config') : null), [firestore, tenantId]);
  const { data: riskMatrixSettings } = useDoc<RiskMatrixSettings>(riskMatrixRef);
  
  const riskRegisterSettingsRef = useMemoFirebase(() => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-register-config') : null), [firestore, tenantId]);
  const { data: registerSettings } = useDoc<RiskRegisterSettings>(riskRegisterSettingsRef);

  const hazardAreas = React.useMemo(() => {
      return registerSettings?.hazardAreas || DEFAULT_HAZARD_AREAS;
  }, [registerSettings]);

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapDatesToObjects(existingRisk),
  });

  const onSubmit = async (data: RiskFormValues) => {
    if (!firestore || !tenantId) return;
    setIsSubmitting(true);
    
    // Convert dates back to ISO strings before saving
    const dataToSave = {
        ...data,
        risks: data.risks.map(risk => ({
            ...risk,
            mitigations: risk.mitigations.map(mitigation => ({
                ...mitigation,
                reviewDate: mitigation.reviewDate.toISOString()
            }))
        }))
    };

    try {
        if (existingRisk) {
            const riskRef = doc(firestore, `tenants/${tenantId}/risks`, existingRisk.id);
            await updateDocumentNonBlocking(riskRef, dataToSave);
            toast({ title: "Risk Updated", description: "The risk has been updated in the register." });
        } else {
            const risksCollection = collection(firestore, `tenants/${tenantId}/risks`);
            await addDocumentNonBlocking(risksCollection, { ...dataToSave, status: 'Open' });
            toast({ title: "Hazard Added", description: "The new hazard and its risks have been added to the register." });
        }
        if (onCancel) onCancel();
        else router.push('/safety/risk-register');
    } catch (error) {
        console.error("Error saving risk:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the risk." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!hideHeader && (
            <CardHeader className="px-0">
                <CardTitle>{existingRisk ? 'Edit Hazard' : 'Add New Hazard'}</CardTitle>
                <CardDescription>A hazard can have multiple associated risks, and each risk can have multiple mitigations.</CardDescription>
            </CardHeader>
          )}
          <CardContent className="px-0 space-y-6">
            <FormField control={form.control} name="hazardArea" render={({ field }) => ( <FormItem><FormLabel>Hazard Area</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a hazard area" /></SelectTrigger></FormControl><SelectContent>{hazardAreas.map(area => ( <SelectItem key={area} value={area}>{area}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="hazard" render={({ field }) => ( <FormItem><FormLabel>Hazard Identification</FormLabel><FormControl><Textarea placeholder="Describe the identifiable hazard (e.g., Unstable approach conditions)..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Associated Risks & Outcomes</h3>
              <RisksArray personnel={personnel} riskMatrixColors={riskMatrixSettings?.colors} />
              <FormField control={form.control} name="risks" render={({ field }) => ( <FormMessage className="mt-2" /> )} />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="outline" onClick={onCancel || (() => router.back())} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="w-40">{isSubmitting ? 'Saving...' : (existingRisk ? 'Save Changes' : 'Add Hazard')}</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
