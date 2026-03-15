'use client';

import React from 'react';
import { useForm, useFieldArray, useFormContext, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import type { SafetyReport } from '@/types/safety-report';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PlusCircle, Trash2, Save, ShieldAlert, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';

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
    const severityToLetter: { [key: number]: string } = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
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

// --- Form Schemas ---
const riskAssessmentSchema = z.object({
    severity: z.number().min(1).max(5),
    likelihood: z.number().min(1).max(5),
    riskScore: z.number(),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const reportRiskSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Risk description is required."),
    riskAssessment: riskAssessmentSchema,
});

const reportHazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    risks: z.array(reportRiskSchema).optional(),
});

const hazardIdentificationSchema = z.object({
  initialHazards: z.array(reportHazardSchema),
});

type FormValues = z.infer<typeof hazardIdentificationSchema>;

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <label className={cn("text-[10px] font-bold uppercase text-muted-foreground block", className)}>
        {children}
    </label>
);

const RiskAssessmentEditor = ({ path, label, riskMatrixColors }: { path: string; label: string; riskMatrixColors?: Record<string, string> }) => {
    const { control, setValue, watch } = useFormContext<FormValues>();
    
    const likelihood = watch(`${path}.likelihood` as any) || 1;
    const severity = watch(`${path}.severity` as any) || 1;
    
    const riskScore = likelihood * severity;
    const riskLevel = getRiskLevel(riskScore);
    const { backgroundColor, color } = getRiskScoreColor(likelihood, severity, riskMatrixColors);

    const severityLetters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const displayValue = `${likelihood}${severityLetters[severity] || 'E'}`;

    React.useEffect(() => {
        setValue(`${path}.riskScore` as any, riskScore);
        setValue(`${path}.riskLevel` as any, riskLevel);
    }, [riskScore, riskLevel, path, setValue]);

    return (
        <div className="flex items-center gap-4 p-3 bg-background border rounded-lg shadow-sm">
            <div className="flex-1 space-y-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        control={control}
                        name={`${path}.likelihood` as any}
                        render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase">Likelihood: {field.value}</Label>
                                <Slider 
                                    value={[field.value || 1]} 
                                    onValueChange={(val) => field.onChange(val[0])} 
                                    min={1} max={5} step={1} 
                                />
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name={`${path}.severity` as any}
                        render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase">Severity: {field.value}</Label>
                                <Slider 
                                    value={[field.value || 1]} 
                                    onValueChange={(val) => field.onChange(val[0])} 
                                    min={1} max={5} step={1} 
                                />
                            </div>
                        )}
                    />
                </div>
            </div>
            <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner"
                style={{ backgroundColor, color }}
            >
                {displayValue}
            </div>
        </div>
    );
};

const RisksArray = ({ hazardIndex, riskMatrixColors }: { hazardIndex: number; riskMatrixColors?: Record<string, string> }) => {
    const { control } = useFormContext<FormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `initialHazards.${hazardIndex}.risks`,
    });

    return (
        <div className="space-y-3 pl-4 border-l-2 ml-2 mt-3">
            {fields.map((field, riskIndex) => (
                <div key={field.id} className="p-3 bg-muted/30 border rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                        <FormField
                            control={control}
                            name={`initialHazards.${hazardIndex}.risks.${riskIndex}.description`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Identified Risk / Outcome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Loss of separation, Mid-air collision" {...field} className="h-8 text-xs" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(riskIndex)} 
                            className="h-8 w-8 text-destructive mt-5"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <RiskAssessmentEditor 
                        path={`initialHazards.${hazardIndex}.risks.${riskIndex}.riskAssessment`}
                        label="Assessment"
                        riskMatrixColors={riskMatrixColors}
                    />
                </div>
            ))}
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ 
                    id: uuidv4(), 
                    description: '', 
                    riskAssessment: { likelihood: 1, severity: 1, riskScore: 1, riskLevel: 'Low' } 
                })}
                className="h-7 text-[10px]"
            >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Risk Assessment
            </Button>
        </div>
    );
};

interface HazardIdentificationFormProps {
  report: SafetyReport;
  tenantId: string;
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
}

export function HazardIdentificationForm({ report, tenantId, riskMatrixColors, isStacked = false }: HazardIdentificationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(hazardIdentificationSchema),
    defaultValues: {
      initialHazards: report.initialHazards || [],
    },
  });

  const { fields: hazardFields, append: appendHazard, remove: removeHazard } = useFieldArray({
    control: form.control,
    name: "initialHazards",
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;
    const reportRef = doc(firestore, 'tenants', tenantId, 'safety-reports', report.id);
    updateDocumentNonBlocking(reportRef, values);
    toast({ title: 'Hazard Identification Saved' });
  };

  return (
    <Card className={cn("flex flex-col shadow-none border", !isStacked && "h-[calc(100vh-300px)] overflow-hidden")}>
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Hazard & Risk Identification</CardTitle>
                <CardDescription>Break down the event into core hazards and assess their potential outcomes.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendHazard({ id: uuidv4(), description: '', risks: [] })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
            </Button>
        </div>
      </CardHeader>
      <div className={cn("flex-1 p-0 overflow-hidden", isStacked && "overflow-visible")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-6">
                  <HazardFields hazardFields={hazardFields} form={form} riskMatrixColors={riskMatrixColors} removeHazard={removeHazard} />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    <HazardFields hazardFields={hazardFields} form={form} riskMatrixColors={riskMatrixColors} removeHazard={removeHazard} />
                  </div>
                </ScrollArea>
              )}
              <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Save Hazard Identification
                </Button>
              </div>
            </form>
          </Form>
        </FormProvider>
      </div>
    </Card>
  );
}

function HazardFields({ hazardFields, form, riskMatrixColors, removeHazard }: { hazardFields: any[], form: any, riskMatrixColors?: Record<string, string>, removeHazard: (i: number) => void }) {
  return (
    <>
      {hazardFields.map((field, index) => (
          <Card key={field.id} className="border-none shadow-none bg-muted/10">
              <CardHeader className="p-4 pb-0">
                  <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                      </div>
                      <FormField control={form.control} name={`initialHazards.${index}.description`} render={({ field }) => (
                          <FormItem className='flex-1 space-y-0'>
                              <FormControl>
                                  <Input placeholder="Hazard description..." {...field} className="h-8 text-sm font-bold bg-background" />
                              </FormControl>
                          </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeHazard(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                  <RisksArray hazardIndex={index} riskMatrixColors={riskMatrixColors} />
              </CardContent>
          </Card>
      ))}
      {hazardFields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <ShieldAlert className="h-12 w-12 mb-4" />
              <p className="text-sm font-medium">No hazards identified yet.</p>
              <p className="text-xs">Start by identifying the primary hazards associated with this report.</p>
          </div>
      )}
    </>
  );
}
