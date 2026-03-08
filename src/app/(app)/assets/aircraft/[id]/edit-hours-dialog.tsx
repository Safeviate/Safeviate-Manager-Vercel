
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
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
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const hoursSchema = z.object({
  currentHobbs: z.coerce.number().min(0, "Hours cannot be negative"),
  currentTacho: z.coerce.number().min(0, "Hours cannot be negative"),
  tachoAtNext50Inspection: z.coerce.number().min(0, "Hours cannot be negative"),
  tachoAtNext100Inspection: z.coerce.number().min(0, "Hours cannot be negative"),
});

type FormValues = z.infer<typeof hoursSchema>;

interface EditHoursDialogProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function EditHoursDialog({ aircraft, tenantId }: EditHoursDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(hoursSchema),
    defaultValues: {
      currentHobbs: aircraft.currentHobbs || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!firestore) return;

    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);

    toast({
      title: 'Flight Hours Updated',
      description: `Hobbs and Tacho readings for ${aircraft.tailNumber} have been adjusted.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Clock className="mr-2 h-4 w-4" />
          Edit Flight Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Flight Hours</DialogTitle>
          <DialogDescription>
            Manually adjust the current meter readings for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentHobbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Hobbs</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentTacho"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Tacho</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tachoAtNext50Inspection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next 50hr Due (Tacho)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tachoAtNext100Inspection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next 100hr Due (Tacho)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { Separator } from '@/components/ui/separator';
