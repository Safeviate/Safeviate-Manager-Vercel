'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Risk } from './page';

const riskSchema = z.object({
  hazard: z.string().min(1, 'Hazard description is required.'),
  risk: z.string().min(1, 'Risk description is required.'),
  hazardArea: z.string().min(1, 'Hazard area is required.'),
  process: z.string().optional(),
  initialRiskAssessment: z.object({
    severity: z.number({ coerce: true }).min(1).max(5),
    likelihood: z.number({ coerce: true }).min(1).max(5),
  }),
  mitigationControls: z.string().min(1, 'Mitigation controls are required.'),
  status: z.enum(['Open', 'Mitigated', 'Closed']),
});

type RiskFormValues = z.infer<typeof riskSchema>;

interface RiskFormProps {
    existingRisk?: Risk;
}

export function RiskForm({ existingRisk }: RiskFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';
  const isEditMode = !!existingRisk;

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      hazard: '',
      risk: '',
      hazardArea: '',
      process: '',
      initialRiskAssessment: {
        severity: 1,
        likelihood: 1,
      },
      mitigationControls: '',
      status: 'Open',
    },
  });

  useEffect(() => {
    if (isEditMode && existingRisk) {
        form.reset(existingRisk);
    }
  }, [isEditMode, existingRisk, form]);

  const onSubmit = async (values: RiskFormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to manage risks.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const riskScore = values.initialRiskAssessment.severity * values.initialRiskAssessment.likelihood;
      
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
      if (riskScore <= 4) riskLevel = 'Low';
      else if (riskScore <= 9) riskLevel = 'Medium';
      else if (riskScore <= 16) riskLevel = 'High';
      else riskLevel = 'Critical';
      
      const riskData = {
          ...values,
          initialRiskAssessment: {
              ...values.initialRiskAssessment,
              riskScore,
              riskLevel,
          },
          // For now, mitigated is same as initial
          mitigatedRiskAssessment: {
            ...values.initialRiskAssessment,
            riskScore,
            riskLevel,
          },
          riskOwnerId: user.uid,
      };

      if (isEditMode && existingRisk) {
        const riskRef = doc(firestore, 'tenants', tenantId, 'risks', existingRisk.id);
        await updateDocumentNonBlocking(riskRef, riskData);
        toast({
          title: 'Risk Updated',
          description: 'The risk has been successfully updated.',
        });
      } else {
        const risksRef = collection(firestore, 'tenants', tenantId, 'risks');
        await addDocumentNonBlocking(risksRef, riskData);
        toast({
            title: 'Risk Added',
            description: 'The new organizational risk has been added to the register.',
        });
      }
      
      router.push('/safety/risk-register');

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{isEditMode ? 'Edit Risk' : 'Add New Risk'}</CardTitle>
              <CardDescription>
                {isEditMode ? 'Update the details for this organizational risk.' : 'Add a new organizational risk to the Risk Register.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="hazard" render={({ field }) => ( <FormItem> <FormLabel>Hazard</FormLabel> <FormControl> <Textarea placeholder="e.g., Frequent short-notice changes to the flight schedule" {...field} /> </FormControl> <FormDescription>A description of the condition or situation that has the potential to cause harm.</FormDescription> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="risk" render={({ field }) => ( <FormItem> <FormLabel>Risk</FormLabel> <FormControl> <Textarea placeholder="e.g., Increased likelihood of crew fatigue and planning errors" {...field} /> </FormControl> <FormDescription>The potential negative consequence if the hazard is not managed.</FormDescription> <FormMessage /> </FormItem> )} />
                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="hazardArea" render={({ field }) => ( <FormItem> <FormLabel>Hazard Area</FormLabel> <FormControl> <Input placeholder="e.g., Flight Operations, Maintenance" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="process" render={({ field }) => ( <FormItem> <FormLabel>Process</FormLabel> <FormControl> <Input placeholder="e.g., Flight Dispatch" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                </div>
                
                <Separator />
                
                <div>
                    <h3 className="text-lg font-medium mb-2">Initial Risk Assessment</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField control={form.control} name="initialRiskAssessment.likelihood" render={({ field }) => ( <FormItem> <FormLabel>Likelihood (1-5)</FormLabel> <FormControl> <Input type="number" min="1" max="5" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="initialRiskAssessment.severity" render={({ field }) => ( <FormItem> <FormLabel>Severity (1-5)</FormLabel> <FormControl> <Input type="number" min="1" max="5" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    </div>
                </div>

                <Separator />

                <FormField control={form.control} name="mitigationControls" render={({ field }) => ( <FormItem> <FormLabel>Mitigation Controls</FormLabel> <FormControl> <Textarea placeholder="Describe the procedures or actions in place to mitigate the risk..." {...field} /> </FormControl> <FormMessage /> </FormItem> )} />

                <Separator />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className='w-56'>
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Mitigated">Mitigated</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/safety/risk-register')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Risk'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
