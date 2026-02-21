
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  make: z.string().min(1, { message: 'Make is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  tailNumber: z.string().min(1, { message: 'Tail number is required.' }),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.string().optional(),
  currentHobbs: z.string().optional(),
  initialTacho: z.string().optional(),
  currentTacho: z.string().optional(),
});

export function AircraftForm() {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: '',
      model: '',
      tailNumber: '',
      type: 'Single-Engine',
      initialHobbs: '',
      currentHobbs: '',
      initialTacho: '',
      currentTacho: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    const aircraftData = {
      ...values,
      initialHobbs: values.initialHobbs ? parseFloat(values.initialHobbs) : 0,
      currentHobbs: values.currentHobbs ? parseFloat(values.currentHobbs) : 0,
      initialTacho: values.initialTacho ? parseFloat(values.initialTacho) : 0,
      currentTacho: values.currentTacho ? parseFloat(values.currentTacho) : 0,
    };

    const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
    addDocumentNonBlocking(aircraftsCollection, aircraftData);
    toast({
      title: 'Aircraft Created',
      description: `Aircraft ${aircraftData.tailNumber} has been added to the fleet.`,
    });

    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Aircraft</DialogTitle>
          <DialogDescription>
            Add a new aircraft to your fleet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="aircraft-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cessna" />
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
                      <Input {...field} placeholder="e.g., 172" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="tailNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tail Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., N12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initialHobbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Hobbs Hours</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g., 1200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentHobbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Hobbs Hours</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g., 1200" />
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
                    <FormLabel>Initial Tacho Hours</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g., 1200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentTacho"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Tacho Hours</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g., 1200" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" form="aircraft-form">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
