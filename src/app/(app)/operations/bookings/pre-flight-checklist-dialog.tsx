'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from './booking-functions';
import { useFirestore } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '../../assets/page';

interface PreFlightChecklistDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  booking: Booking;
  aircraft: Aircraft;
  tenantId: string;
}

const preFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
  documentsChecked: z.array(z.string()).refine(value => value.length > 0, {
    message: "At least one document must be checked.",
  }),
});

type PreFlightFormValues = z.infer<typeof preFlightSchema>;

const documents = [
    { id: 'poh', label: 'P.O.H' },
    { id: 'cors', label: 'C of RS' },
    { id: 'cofa', label: 'C of A' },
    { id: 'noise', label: 'Noise Cert' },
    { id: 'techlog', label: 'Tech Log' },
];

export function PreFlightChecklistDialog({ isOpen, setIsOpen, booking, aircraft, tenantId }: PreFlightChecklistDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<PreFlightFormValues>({
    resolver: zodResolver(preFlightSchema),
    defaultValues: useMemo(() => ({
        actualHobbs: booking.preFlight?.actualHobbs || 0,
        actualTacho: booking.preFlight?.actualTacho || 0,
        oil: booking.preFlight?.oil || 0,
        fuel: booking.preFlight?.fuel || 0,
        documentsChecked: booking.preFlight?.documentsChecked || [],
    }), [booking.preFlight]),
  });

  const onSubmit = async (values: PreFlightFormValues) => {
    if (!booking || !firestore) return;

    try {
      await updateBooking(
        firestore,
        tenantId,
        booking.id,
        { preFlight: values },
        booking.aircraftId,
        true,
        false
      );
      toast({
        title: 'Pre-Flight Submitted',
        description: 'The pre-flight checklist has been saved.',
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pre-Flight Checklist</DialogTitle>
          <DialogDescription>
            For Booking #{booking.bookingNumber} - Aircraft {aircraft.tailNumber}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="actualHobbs" render={({ field }) => ( <FormItem><FormLabel>Actual Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="actualTacho" render={({ field }) => ( <FormItem><FormLabel>Actual Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="oil" render={({ field }) => ( <FormItem><FormLabel>Oil (lts)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="fuel" render={({ field }) => ( <FormItem><FormLabel>Fuel (lts)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            
            <FormField
              control={form.control}
              name="documentsChecked"
              render={() => (
                <FormItem>
                  <div className="mb-4"><FormLabel className="text-base">Documents Checked</FormLabel></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {documents.map((item) => (
                      <FormField key={item.id} control={form.control} name="documentsChecked"
                        render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item.id])
                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Pre-Flight</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
