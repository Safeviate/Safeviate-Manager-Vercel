'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  make: z.string().min(1, { message: 'Make is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  tailNumber: z.string().min(1, { message: 'Tail Number is required.' }),
  initialHobbs: z.coerce.number().optional(),
  currentHobbs: z.coerce.number().optional(),
  initialTacho: z.coerce.number().optional(),
  currentTacho: z.coerce.number().optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

export default function NewAircraftPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const tenantId = 'safeviate';

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: '',
      model: '',
      tailNumber: '',
    },
  });

  async function onSubmit(values: AircraftFormValues) {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
      await addDocumentNonBlocking(aircraftsCollection, values);
      
      toast({
        title: 'Aircraft Created',
        description: `Aircraft ${values.tailNumber} has been added to the fleet.`,
      });
      router.push('/assets/aircraft');
    } catch (error) {
      console.error('Failed to create aircraft:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create aircraft.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline">
        <Link href="/assets/aircraft">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Aircraft List
        </Link>
      </Button>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Create New Aircraft</CardTitle>
              <CardDescription>Add a new aircraft to your fleet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel>Tail Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho Hours</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
            </CardContent>
            <div className="p-6 pt-0 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/assets/aircraft')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Aircraft'}</Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  );
}
