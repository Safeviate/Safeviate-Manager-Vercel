'use client';

import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange, MocPhase, MocRisk, MocMitigation, MocHazard, MocStep } from '@/types/moc';
import { PlusCircle, Trash2, GripVertical, WandSparkles, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { analyzeMoc, type AnalyzeMocInput } from '@/ai/flows/analyze-moc-flow';
import { useState, useEffect } from 'react';

// --- Zod Schemas (now complete to prevent data loss) ---
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

const stepSchema: z.ZodType<MocStep> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string().min(1, 'Step description is required.'),
    hazards: z.array(hazardSchema),
}));

const phaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Phase title is required.'),
  steps: z.array(stepSchema),
});

const formSchema = z.object({
  phases: z.array(phaseSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface ImplementationPlanFormProps {
  moc: ManagementOfChange;
  tenantId: string;
}

// Helper to handle date conversions for form state
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

const StepsArray = ({ phaseIndex }: { phaseIndex: number }) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({
      control,
      name: `phases.${phaseIndex}.steps`,
    });
  
    return (
      <div className="pl-6 border-l ml-3 space-y-3 pt-4">
        {fields.map((field, stepIndex) => (
          <div key={field.id} className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
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
            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(stepIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ id: uuidv4(), description: '', hazards: [] })}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Step
        </Button>
      </div>
    );
  };

export function ImplementationPlanForm({ moc, tenantId }: ImplementationPlanFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phases: mapDatesToObjects(moc.phases || []),
    },
  });

  useEffect(() => {
    form.reset(mapDatesToObjects(moc.phases || []));
  }, [moc.phases, form]);

  const { fields: phaseFields, append: appendPhase, remove: removePhase } = useFieldArray({
    control: form.control,
    name: 'phases',
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const mocRef = doc(firestore, `tenants/${tenantId}/management-of-change`, moc.id);
    const dataToSave = { phases: mapDatesToStrings(values.phases) };
    updateDocumentNonBlocking(mocRef, dataToSave);
    toast({
      title: 'Implementation Plan Saved',
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

        const mocRef = doc(firestore, `tenants/${tenantId}/management-of-change`, moc.id);
        
        // This is a temporary fix. Directly updating the document should trigger a re-render.
        // However, we'll also update the form state manually to ensure immediate feedback.
        const phasesWithDateObjects = mapDatesToObjects(result.phases);
        form.setValue('phases', phasesWithDateObjects, { shouldValidate: true });

        const dataToSave = { phases: mapDatesToStrings(result.phases) };
        updateDocumentNonBlocking(mocRef, dataToSave);

        toast({ title: 'AI Analysis Complete', description: 'The implementation plan has been populated with the AI suggestions.' });
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
          <div className="flex justify-end gap-2">
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
              <Card key={field.id}>
                <CardHeader className="flex flex-row items-center justify-between">
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
                  <Button type="button" variant="destructive" size="sm" onClick={() => removePhase(index)}>
                    Delete Phase
                  </Button>
                </CardHeader>
                <CardContent>
                  <StepsArray phaseIndex={index} />
                </CardContent>
              </Card>
            ))}
            {phaseFields.length === 0 && (
              <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                  <p>No implementation phases defined.</p>
                  <p className="text-sm">Click "Add Phase" to get started or use the AI analyzer.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit">Save Implementation Plan</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
