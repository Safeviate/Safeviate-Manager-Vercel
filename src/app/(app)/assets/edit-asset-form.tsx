'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { Aircraft } from './page';

const formSchema = z.object({
  tailNumber: z.string().min(1, "Tail number is required."),
  model: z.string().min(1, "Model is required."),
  abbreviation: z.string().optional(),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAircraftFormProps {
  existingAircraft: Aircraft;
  onSave: (data: FormValues) => void;
  onCancel: () => void;
}

export function EditAircraftForm({ existingAircraft, onSave, onCancel }: EditAircraftFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tailNumber: existingAircraft.tailNumber || '',
      model: existingAircraft.model || '',
      abbreviation: existingAircraft.abbreviation || '',
      type: existingAircraft.type || 'Single-Engine',
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSave(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="tailNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>Tail Number</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="model" render={({ field }) => (
          <FormItem>
            <FormLabel>Model</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="abbreviation" render={({ field }) => (
            <FormItem>
                <FormLabel>Abbreviation (5 characters)</FormLabel>
                <FormControl><Input maxLength={5} {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </DialogClose>
          <Button type="submit">Save Changes</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
