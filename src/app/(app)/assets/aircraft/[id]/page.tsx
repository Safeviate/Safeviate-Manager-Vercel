'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';

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

interface EditAircraftPageProps {
  params: { id: string };
}

export default function EditAircraftPage({ params }: EditAircraftPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (aircraft) {
      form.reset(aircraft);
    }
  }, [aircraft, form]);


  async function onSubmit(values: AircraftFormValues) {
    if (!firestore || !aircraft) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available or aircraft not found.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const aircraftDocRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
      await updateDocumentNonBlocking(aircraftDocRef, values);
      
      toast({
        title: 'Aircraft Updated',
        description: `Aircraft ${values.tailNumber} has been updated.`,
      });
      router.push('/assets/aircraft');
    } catch (error) {
      console.error('Failed to update aircraft:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update aircraft.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-9 w-40" />
              <Card>
                  <CardHeader>
                      <Skeleton className="h-8 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                      <Skeleton className="h-14 w-full" />
                      <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                  </CardContent>
              </Card>
          </div>
      )
  }

  if (error || !aircraft) {
      return <div className="text-destructive text-center">Error loading aircraft data. It may have been deleted.</div>
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
              <CardTitle>Edit Aircraft: {aircraft.tailNumber}</CardTitle>
              <CardDescription>Update the details for this aircraft.</CardDescription>
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
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  );
}
