'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Define schemas for validation
const mitigationSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Mitigation description is required."),
    responsiblePersonId: z.string().min(1, "Assignee is required."),
    completionDate: z.date(),
    status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']),
});

const riskSchema = z.object({
    id: z.string(),
    description: z.string(), // We'll keep this simple for now
    mitigations: z.array(mitigationSchema),
});

const hazardSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Hazard description is required."),
    risks: z.array(riskSchema),
});

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

interface HazardAnalysisFormProps {
  moc: ManagementOfChange;
  tenantId: string;
  personnel: Personnel[];
}

// Helper to convert date strings to Date objects for the form
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
                        completionDate: new Date(mitigation.completionDate),
                    })),
                })),
            })),
        })),
    }));
};

// Helper to convert Date objects back to strings for Firestore
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

export function HazardAnalysisForm({ moc, tenantId, personnel }: HazardAnalysisFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const MitigationsArray = ({ phaseIndex, stepIndex, hazardIndex, riskIndex }: { phaseIndex: number, stepIndex: number, hazardIndex: number, riskIndex: number }) => {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations`,
    });

    return (
        <div className='pl-6 mt-4 space-y-3'>
            {fields.map((field, mitigationIndex) => (
                <div key={field.id} className="p-3 border rounded-md bg-background grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <FormField control={form.control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-4"><FormLabel>Mitigation</FormLabel><FormControl><Textarea placeholder='Describe the mitigation...' {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.responsiblePersonId`} render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.completionDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.risks.${riskIndex}.mitigations.${mitigationIndex}.status`} render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(mitigationIndex)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', responsiblePersonId: '', completionDate: new Date(), status: 'Open' })}><PlusCircle className="mr-2 h-4 w-4" />Add Mitigation</Button>
        </div>
    )
  }
  
  const HazardsArray = ({ phaseIndex, stepIndex }: { phaseIndex: number, stepIndex: number }) => {
      const { fields, append, remove } = useFieldArray({
          control: form.control,
          name: `phases.${phaseIndex}.steps.${stepIndex}.hazards`,
      });

      const addHazard = () => {
          // When adding a hazard, also add a default, empty risk to hold mitigations
          append({ id: uuidv4(), description: '', risks: [{ id: uuidv4(), description: 'Default Risk', mitigations: [] }] });
      }

      return (
          <div className="pl-6 mt-4 space-y-4">
              {fields.map((field, hazardIndex) => (
                  <Card key={field.id}>
                      <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
                           <FormField control={form.control} name={`phases.${phaseIndex}.steps.${stepIndex}.hazards.${hazardIndex}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Hazard Description</FormLabel><FormControl><Input placeholder='Describe the hazard...' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(hazardIndex)}><Trash2 className="h-4 w-4" /></Button>
                      </CardHeader>
                      <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm">Mitigations</h4>
                          {/* We assume one risk per hazard for UI simplification */}
                          <MitigationsArray phaseIndex={phaseIndex} stepIndex={stepIndex} hazardIndex={hazardIndex} riskIndex={0} />
                      </CardContent>
                  </Card>
              ))}
               <Button type="button" variant="secondary" onClick={addHazard}><PlusCircle className="mr-2 h-4 w-4" /> Add Hazard</Button>
          </div>
      )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Accordion type="multiple" defaultValue={(moc.phases || []).map(p => p.id)} className="w-full space-y-4">
          {(phaseFields || []).map((phase, phaseIndex) => (
            <AccordionItem key={phase.id} value={phase.id} className="border rounded-lg">
                <AccordionTrigger className="p-4 text-lg font-semibold bg-muted/20 hover:no-underline rounded-t-lg">
                    {phase.title}
                </AccordionTrigger>
                <AccordionContent className="p-4">
                    {(phase.steps || []).map((step, stepIndex) => (
                        <div key={step.id} className="py-4 border-b last:border-0">
                            <p className="font-medium">{stepIndex + 1}. {step.description}</p>
                             <HazardsArray phaseIndex={phaseIndex} stepIndex={stepIndex} />
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
         {phaseFields.length === 0 && (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <p>No implementation plan defined.</p>
                <p className="text-sm">Please add phases and steps in the &quot;Implementation Plan&quot; tab first.</p>
            </div>
        )}
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Hazard Analysis</Button>
        </div>
      </form>
    </Form>
  );
}
