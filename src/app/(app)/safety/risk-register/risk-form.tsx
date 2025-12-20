
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
});

export type RiskFormValues = z.infer<typeof formSchema>;

interface RiskFormProps {
  onSubmit: (values: RiskFormValues) => Promise<void>;
  isSubmitting: boolean;
  existingRisk?: Risk | null;
}

const getRiskScoreColorClass = (score: number) => {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500 text-black';
    if (score <= 16) return 'bg-orange-500';
    return 'bg-red-500';
};

export function RiskForm({ onSubmit, isSubmitting, existingRisk }: RiskFormProps) {
  const router = useRouter();

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hazardArea: existingRisk?.hazardArea,
      hazard: existingRisk?.hazard || '',
      risk: existingRisk?.risk || '',
      likelihood: existingRisk?.likelihood || 1,
      severity: existingRisk?.severity || 1,
    },
  });

  const likelihood = form.watch('likelihood');
  const severity = form.watch('severity');
  const riskScore = likelihood * severity;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{existingRisk ? 'Edit Risk' : 'Add New Risk'}</CardTitle>
            <CardDescription>
              {existingRisk ? 'Update the details for this risk.' : 'Add a new organizational risk to the register.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <FormField control={form.control} name="hazard" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hazard</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the hazard..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="risk" render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the associated risk..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                  <Controller
                      control={form.control}
                      name="likelihood"
                      render={({ field: { onChange, value } }) => (
                          <FormItem>
                              <FormLabel>Likelihood: {value}</FormLabel>
                              <FormControl>
                                  <Slider
                                      value={[value]}
                                      onValueChange={(vals) => onChange(vals[0])}
                                      min={1}
                                      max={5}
                                      step={1}
                                  />
                              </FormControl>
                          </FormItem>
                      )}
                  />
                  <Controller
                      control={form.control}
                      name="severity"
                      render={({ field: { onChange, value } }) => (
                          <FormItem>
                              <FormLabel>Severity: {value}</FormLabel>
                              <FormControl>
                                  <Slider
                                      value={[value]}
                                      onValueChange={(vals) => onChange(vals[0])}
                                      min={1}
                                      max={5}
                                      step={1}
                                  />
                              </FormControl>
                          </FormItem>
                      )}
                  />
              </div>
              <div className="flex justify-center items-center">
                <div className={cn("flex items-center justify-center h-24 w-24 rounded-full text-white text-3xl font-bold", getRiskScoreColorClass(riskScore))}>
                    {riskScore}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
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
