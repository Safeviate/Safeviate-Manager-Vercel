'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from './booking-functions';
import { useFirestore } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '../../assets/page';
import { useEffect } from 'react';

interface PostFlightChecklistDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  booking: Booking;
  aircraft: Aircraft;
  tenantId: string;
}

const postFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
});

type PostFlightFormValues = z.infer<typeof postFlightSchema>;

export function PostFlightChecklistDialog({ isOpen, setIsOpen, booking, aircraft, tenantId }: PostFlightChecklistDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<PostFlightFormValues>({
    resolver: zodResolver(postFlightSchema),
    defaultValues: {
      actualHobbs: aircraft.currentHobbs || 0,
      actualTacho: aircraft.currentTacho || 0,
      oil: undefined, // Start blank
      fuel: undefined, // Start blank
    },
  });

  useEffect(() => {
    if (isOpen) {
      // When the dialog opens, reset the form to its clean default state
      form.reset({
        actualHobbs: aircraft.currentHobbs || 0,
        actualTacho: aircraft.currentTacho || 0,
        oil: undefined,
        fuel: undefined,
      });
    }
  }, [isOpen, aircraft, form]);


  const onSubmit = async (values: PostFlightFormValues) => {
    if (!booking || !firestore) return;

    try {
      await updateBooking({
        firestore,
        tenantId,
        bookingId: booking.id,
        updateData: { postFlight: values, status: 'Completed' },
        aircraft,
        isSubmittingPostFlight: true,
      });
      toast({
        title: 'Post-Flight Submitted',
        description: 'The post-flight checklist has been saved.',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post-Flight Checklist</DialogTitle>
          <DialogDescription>
            For Booking #{booking.bookingNumber} - Aircraft {aircraft.tailNumber}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="actualHobbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Hobbs</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter Hobbs reading" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualTacho"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Tacho</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter Tacho reading" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="oil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oil (lts)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter oil quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel (lts)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter fuel quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Post-Flight</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
