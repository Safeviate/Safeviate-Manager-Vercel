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
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { make: '', model: '', tailNumber: '', type: 'Single-Engine' },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/aircraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aircraft: {
            id: crypto.randomUUID(),
            ...values,
            initialHobbs: 0,
            currentHobbs: 0,
            initialTacho: 0,
            currentTacho: 0,
            tachoAtNext50Inspection: 50,
            tachoAtNext100Inspection: 100,
            components: [],
            documents: [],
            type: values.type || 'Single-Engine',
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to save aircraft.');
      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      toast({ title: 'Aircraft Added', description: `${values.make} ${values.model} (${values.tailNumber}) has been added to the fleet.` });
      router.push('/assets/aircraft');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save aircraft.' });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto pt-4 pb-12 px-4 shadow-none">
        <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/5 border-b p-8">
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Add New Aircraft</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Register a new physical asset into the flight management system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Manufacturer</FormLabel><FormControl><Input className="h-12 font-bold" placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Model Variant</FormLabel><FormControl><Input className="h-12 font-bold" placeholder="e.g., 172N" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tailNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Tail Number (Registration)</FormLabel><FormControl><Input className="h-12 font-black uppercase" placeholder="e.g., ZS-FGE" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Engine Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" className="h-12 px-10 text-[10px] font-black uppercase border-slate-300" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" className="h-12 px-10 text-[10px] font-black uppercase shadow-lg" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register Asset'}</Button>
        </div>
      </form>
    </Form>
  );
}
