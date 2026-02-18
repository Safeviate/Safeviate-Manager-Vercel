
'use client';

import { useForm, Controller } from 'react-hook-form';
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
import type { Risk } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const HAZARD_AREAS: Risk['hazardArea'][] = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

const formSchema = z.object({
  hazardArea: z.enum(HAZARD_AREAS, { required_error: 'Hazard area is required.' }),
  hazard: z.string().min(1, 'Hazard description is required.'),
  risk: z.string().min(1, 'Risk description is required.'),
  likelihood: z.number().min(1).max(5),
  severity: z.number().min(1).max(5),
  mitigation: z.string().optional(),
  responsiblePersonId: z.string().optional(),
  reviewDate: z.date().optional(),
  residualLikelihood: z.number().min(1).max(5).optional(),
  residualSeverity: z.number().min(1).max(5).optional(),
});

export type RiskFormValues = z.infer<typeof formSchema>;

interface RiskFormProps {
  onSubmit: (values: RiskFormValues) => Promise<void>;
  isSubmitting: boolean;
  existingRisk?: Risk | null;
  personnel: Personnel[];
  onCancel?: () => void;
}

const getRiskScoreColorClass = (score: number) => {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500 text-black';
    if (score <= 16) return 'bg-orange-500';
    return 'bg-red-500';
};

export function RiskForm({ onSubmit, isSubmitting, existingRisk, personnel, onCancel }: RiskFormProps) {
  const router = useRouter();

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hazardArea: existingRisk?.hazardArea,
      hazard: existingRisk?.hazard || '',
      risk: existingRisk?.risk || '',
      likelihood: existingRisk?.likelihood || 1,
      severity: existingRisk?.severity || 1,
      mitigation: existingRisk?.mitigation || '',
      responsiblePersonId: existingRisk?.responsiblePersonId || '',
      reviewDate: existingRisk?.reviewDate ? new Date(existingRisk.reviewDate) : undefined,
      residualLikelihood: existingRisk?.residualLikelihood || 1,
      residualSeverity: existingRisk?.residualSeverity || 1,
    },
  });

  const likelihood = form.watch('likelihood');
  const severity = form.watch('severity');
  const residualLikelihood = form.watch('residualLikelihood');
  const residualSeverity = form.watch('residualSeverity');

  const riskScore = (likelihood || 1) * (severity || 1);
  const residualRiskScore = (residualLikelihood || 1) * (residualSeverity || 1);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardHeader className="px-0">
          <CardTitle>{existingRisk ? 'Edit Risk' : 'Add New Risk'}</CardTitle>
          <CardDescription>
            {existingRisk ? 'Update the details for this risk.' : 'Add a new organizational risk to the register.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-6">
          <FormField
            control={form.control}
            name="hazardArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hazard Area</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a hazard area" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HAZARD_AREAS.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="hazard" render={({ field }) => (<FormItem><FormLabel>Hazard</FormLabel><FormControl><Textarea placeholder="Describe the hazard..." {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="risk" render={({ field }) => (<FormItem><FormLabel>Risk</FormLabel><FormControl><Textarea placeholder="Describe the associated risk..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
          
          <Separator />
          
          <h3 className="text-lg font-medium">Initial Risk Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <Controller control={form.control} name="likelihood" render={({ field: { onChange, value } }) => (<FormItem><FormLabel>Likelihood: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem>)}/>
                <Controller control={form.control} name="severity" render={({ field: { onChange, value } }) => (<FormItem><FormLabel>Severity: {value}</FormLabel><FormControl><Slider value={[value]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem>)}/>
            </div>
            <div className="flex justify-center items-center">
              <div className={cn("flex items-center justify-center h-24 w-24 rounded-full text-white text-3xl font-bold", getRiskScoreColorClass(riskScore))}>
                  {riskScore}
              </div>
            </div>
          </div>

          <Separator />

          <h3 className="text-lg font-medium">Mitigation & Responsibility</h3>
           <FormField control={form.control} name="mitigation" render={({ field }) => (<FormItem><FormLabel>Mitigation / Control Measures</FormLabel><FormControl><Textarea placeholder="Describe the steps taken to mitigate this risk..." {...field} /></FormControl><FormMessage /></FormItem>)} />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="responsiblePersonId" render={({ field }) => ( <FormItem><FormLabel>Responsible Person</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="reviewDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Next Review Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
           </div>
           
           <Separator />

           <h3 className="text-lg font-medium">Residual Risk Assessment</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <Controller control={form.control} name="residualLikelihood" render={({ field: { onChange, value } }) => (<FormItem><FormLabel>Residual Likelihood: {value}</FormLabel><FormControl><Slider value={[value || 1]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem>)}/>
                <Controller control={form.control} name="residualSeverity" render={({ field: { onChange, value } }) => (<FormItem><FormLabel>Residual Severity: {value}</FormLabel><FormControl><Slider value={[value || 1]} onValueChange={(vals) => onChange(vals[0])} min={1} max={5} step={1} /></FormControl></FormItem>)}/>
            </div>
            <div className="flex justify-center items-center">
              <div className={cn("flex items-center justify-center h-24 w-24 rounded-full text-white text-3xl font-bold", getRiskScoreColorClass(residualRiskScore))}>
                  {residualRiskScore}
              </div>
            </div>
          </div>
        </CardContent>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel || (() => router.back())} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : (existingRisk ? 'Save Changes' : 'Add Risk')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
