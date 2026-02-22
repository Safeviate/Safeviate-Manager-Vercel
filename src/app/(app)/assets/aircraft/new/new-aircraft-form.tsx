
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  make: z.string().min(1, 'Make is required.'),
  model: z.string().min(1, 'Model is required.'),
  tailNumber: z.string().min(1, 'Tail number is required.'),
  type: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function NewAircraftForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      await addDocumentNonBlocking(aircraftsCollection, {
        ...values,
        // Initialize other fields
        frameHours: 0,
        engineHours: 0,
        initialHobbs: 0,
        currentHobbs: 0,
        initialTacho: 0,
        currentTacho: 0,
        components: [],
        documents: [],
      });
      toast({ title: 'Aircraft Added', description: `${values.make} ${values.model} (${values.tailNumber}) has been added.` });
      router.push('/assets/aircraft');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Add New Aircraft</CardTitle>
            <CardDescription>Enter the details for the new aircraft in your fleet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 172" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input placeholder="e.g., ZS-ABC" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>
  );
}
