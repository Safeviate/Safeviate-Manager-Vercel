
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
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { Risk, RiskItem, Mitigation } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const HAZARD_AREAS: Risk['hazardArea'][] = [
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
  hazardArea: z.enum(HAZARD_AREAS, { required_error: 'Hazard area is required.' }),
  hazard: z.string().min(1, 'Hazard description is required.'),
  risks: z.array(riskItemSchema).min(1, "At least one risk must be added."),
});

export type RiskFormValues = z.infer<typeof formSchema>;

// --- Helper to map dates for form state ---
const mapDatesToObjects = (risk?: Risk | null): RiskFormValues => {
    if (!risk) {
        return {
            hazardArea: 'Flight Operations',
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

const RiskAssessmentEditor: React.FC<{ path: string; label: string; }> = ({ path, label }) => {
    const { control, setValue, watch } = useFormContext<RiskFormValues>();
    const likelihood = watch(`${path}.likelihood` as any, 1);
    const severity = watch(`${path}.severity` as any, 1);
    const riskScore = (likelihood || 1) * (severity || 1);
    const riskLevel = getRiskLevel(riskScore);
    const colorClass = getRiskScoreColorClass(riskScore);

    React.useEffect(() => {
        setValue(`${path}.riskScore` as any, riskScore);
        setValue(`${path}.riskLevel` as any, riskLevel);
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <Card className="bg-background/50">
            <CardHeader className="pb-4"><CardTitle className="text-base">{label}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                    <Controller control={control} name={`${path}.likelihood` as any} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel>Likelihood: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem> )} />
                    <Controller control={control} name={`${path}.severity` as any} render={({ field: { onChange, value } }) => ( <FormItem><FormLabel>Severity: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem> )}/>
                </div>
                <div className="flex justify-center items-center">
                    <div className={cn("flex items-center justify-center h-20 w-20 rounded-full text-white text-2xl font-bold", colorClass)}>
                        {riskScore}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Nested Field Arrays ---

const MitigationsArray = ({ riskIndex, personnel }: { riskIndex: number; personnel: Personnel[] }) => {
    const { control } = useFormContext<RiskFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `risks.${riskIndex}.mitigations` });

    return (
        <div className='pl-6 mt-4 space-y-4'>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-4 border rounded-md bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Mitigation Action</FormLabel><FormControl><Textarea placeholder='Describe the mitigation...' {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField control={control} name={`risks.${riskIndex}.mitigations.${mitigationIndex}.reviewDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Review Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(mitigationIndex)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  </div>
                  <div className="mt-4"><RiskAssessmentEditor path={`risks.${riskIndex}.mitigations.${mitigationIndex}.residualRiskAssessment`} label="Residual Risk Assessment" /></div>
                </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', reviewDate: new Date(), residualRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } })}><PlusCircle className="mr-2 h-4 w-4" />Add Mitigation</Button>
        </div>
    )
}

const RisksArray = ({ personnel }: { personnel: Personnel[] }) => {
    const { control } = useFormContext<RiskFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `risks` });

    return (
        <div className="space-y-4">
            {fields.map((field, riskIndex) => (
                <Collapsible key={field.id} defaultOpen>
                    <Card className="bg-muted/30">
                        <CardHeader className="flex flex-row items-center">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 [&[data-state=open]>svg]:rotate-180">
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                </Button>
                            </CollapsibleTrigger>
                            <div className="flex-1">
                                <FormField control={control} name={`risks.${riskIndex}.description`} render={({ field }) => ( <FormItem><FormLabel>Risk</FormLabel><FormControl><Input placeholder='Describe the risk...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(riskIndex)}><Trash2 className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="space-y-4">
                                <RiskAssessmentEditor path={`risks.${riskIndex}.initialRiskAssessment`} label="Initial Risk Assessment" />
                                <h4 className="font-semibold pt-4 border-t">Mitigations</h4>
                                <MitigationsArray riskIndex={riskIndex} personnel={personnel} />
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => append({ id: uuidv4(), description: '', initialRiskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' }, mitigations: [] })}><PlusCircle className="mr-2 h-4 w-4" />Add Risk</Button>
        </div>
    )
}


// --- Main Form Component ---
interface RiskFormProps {
  existingRisk?: Risk | null;
  personnel: Personnel[];
  onCancel?: () => void;
}

export function RiskForm({ existingRisk, personnel, onCancel }: RiskFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapDatesToObjects(existingRisk),
  });

  const onSubmit = async (data: RiskFormValues) => {
    if (!firestore) return;
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
            toast({ title: "Risk Added", description: "The new risk has been added to the register." });
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
          <CardHeader className="px-0">
            <CardTitle>{existingRisk ? 'Edit Risk' : 'Add New Risk'}</CardTitle>
            <CardDescription>A hazard can have multiple associated risks, and each risk can have multiple mitigations.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-6">
            <FormField control={form.control} name="hazardArea" render={({ field }) => ( <FormItem><FormLabel>Hazard Area</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a hazard area" /></SelectTrigger></FormControl><SelectContent>{HAZARD_AREAS.map(area => ( <SelectItem key={area} value={area}>{area}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="hazard" render={({ field }) => ( <FormItem><FormLabel>Hazard</FormLabel><FormControl><Textarea placeholder="Describe the hazard..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2">Associated Risks</h3>
              <RisksArray personnel={personnel} />
              <FormField control={form.control} name="risks" render={({ field }) => ( <FormMessage className="mt-2" /> )} />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel || (() => router.back())} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : (existingRisk ? 'Save Changes' : 'Add Risk')}</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
