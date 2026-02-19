'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection } from 'firebase/firestore';

const formSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required.'),
  model: z.string().min(1, 'Model is required.'),
  type: z.enum(['Single-Engine', 'Multi-Engine'], {
    required_error: 'Aircraft type is required.',
  }),
  abbreviation: z.string().optional(),
  initialHobbs: z.number({ coerce: true }).optional(),
  initialTacho: z.number({ coerce: true }).optional(),
});

type AircraftFormValues = z.infer<typeof formSchema>;

export function AircraftForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        tailNumber: '',
        model: '',
        abbreviation: '',
        initialHobbs: 0,
        initialTacho: 0,
    },
  });

  async function onSubmit(values: AircraftFormValues) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not initialized.',
      });
      return;
    }
    
    try {
      const aircraftCollection = collection(firestore, 'tenants/safeviate/aircrafts');
      await addDocumentNonBlocking(aircraftCollection, {
        ...values,
        currentHobbs: values.initialHobbs,
        currentTacho: values.initialTacho,
      });

      toast({
        title: 'Aircraft Added',
        description: `Aircraft ${values.tailNumber} has been successfully added.`,
      });
      router.push('/assets');
    } catch (error) {
      console.error('Error adding aircraft: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not add the aircraft to the database.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Add New Aircraft</CardTitle>
                <CardDescription>Enter the details for the new aircraft to add it to your fleet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="tailNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tail Number</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., N12345" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Cessna 172" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select aircraft type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                                <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="abbreviation"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Abbreviation (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., C172" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="initialHobbs"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Initial Hobbs</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="initialTacho"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Initial Tacho</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit">Add Aircraft</Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
