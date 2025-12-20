'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Department } from '@/app/(app)/admin/department/page';
import type { Personnel } from '@/app/(app)/users/personnel/page';

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  reason: z.string().min(1, "Reason for change is required."),
  scope: z.string().min(1, "Scope of change is required."),
  proposingDepartmentId: z.string().min(1, "Proposing department is required."),
  responsiblePersonId: z.string().min(1, "Responsible person is required."),
});

export type NewMocFormValues = z.infer<typeof formSchema>;

interface NewMocFormProps {
  departments: Department[];
  personnel: Personnel[];
  onSubmit: (values: NewMocFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function NewMocForm({ departments, personnel, onSubmit, isSubmitting }: NewMocFormProps) {
  const router = useRouter();

  const form = useForm<NewMocFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      reason: '',
      scope: '',
      proposingDepartmentId: '',
      responsiblePersonId: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Propose New Change</CardTitle>
            <CardDescription>
              Complete the form below to initiate a formal Management of Change process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title of Change</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction of new aircraft type" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Detailed Description</FormLabel><FormControl><Textarea placeholder="Provide a thorough description of the proposed change..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Reason for Change</FormLabel><FormControl><Textarea placeholder="Explain why this change is necessary..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="scope" render={({ field }) => (<FormItem><FormLabel>Scope of Change</FormLabel><FormControl><Textarea placeholder="Describe who and what will be affected by this change..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="proposingDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposing Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsiblePersonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnel.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
