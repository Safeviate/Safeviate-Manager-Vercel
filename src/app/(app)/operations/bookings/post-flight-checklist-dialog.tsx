
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { DocumentUploader } from '../../users/personnel/[id]/document-uploader';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';


interface PostFlightChecklistDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  booking: Booking;
  aircraft: Aircraft;
  tenantId: string;
  onChecklistSubmitted: () => void;
}

const photoSchema = z.object({
  url: z.string(),
  description: z.string().min(1, "Description is required."),
});

const postFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
  photos: z.array(photoSchema),
});

type PostFlightFormValues = z.infer<typeof postFlightSchema>;

export function PostFlightChecklistDialog({ isOpen, setIsOpen, booking, aircraft, tenantId, onChecklistSubmitted }: PostFlightChecklistDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const form = useForm<PostFlightFormValues>({
    resolver: zodResolver(postFlightSchema),
    defaultValues: {
      actualHobbs: booking.postFlight?.actualHobbs ?? aircraft.currentHobbs ?? 0,
      actualTacho: booking.postFlight?.actualTacho ?? aircraft.currentTacho ?? 0,
      oil: booking.postFlight?.oil ?? '' as any,
      fuel: booking.postFlight?.fuel ?? '' as any,
      photos: booking.postFlight?.photos ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "photos",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        actualHobbs: booking.postFlight?.actualHobbs ?? aircraft.currentHobbs ?? 0,
        actualTacho: booking.postFlight?.actualTacho ?? aircraft.currentTacho ?? 0,
        oil: booking.postFlight?.oil ?? '' as any,
        fuel: booking.postFlight?.fuel ?? '' as any,
        photos: booking.postFlight?.photos ?? [],
      });
    }
  }, [isOpen, aircraft, booking, form]);


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
      onChecklistSubmitted();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred.',
      });
    }
  };

  const handlePhotoUploaded = (docDetails: { name: string; url: string; }) => {
    append({ url: docDetails.url, description: '' });
  };
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post-Flight Checklist</DialogTitle>
            <DialogDescription>
              For Booking #{booking.bookingNumber} - Aircraft {aircraft.tailNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <ScrollArea className="h-[70vh] pr-6">
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="actualHobbs" render={({ field }) => (<FormItem><FormLabel>Actual Hobbs</FormLabel><FormControl><Input type="number" placeholder="Enter Hobbs reading" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="actualTacho" render={({ field }) => (<FormItem><FormLabel>Actual Tacho</FormLabel><FormControl><Input type="number" placeholder="Enter Tacho reading" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="oil" render={({ field }) => (<FormItem><FormLabel>Oil (lts)</FormLabel><FormControl><Input type="number" placeholder="Enter oil quantity" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fuel" render={({ field }) => (<FormItem><FormLabel>Fuel (lts)</FormLabel><FormControl><Input type="number" placeholder="Enter fuel quantity" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  
                  <Separator />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="photos"
                      render={() => (
                        <FormItem>
                           <div className="flex items-center justify-between">
                            <FormLabel className="text-base">Photos</FormLabel>
                            <DocumentUploader
                                onDocumentUploaded={handlePhotoUploaded}
                                trigger={(openDialog) => (
                                  <Button type="button" size="sm" variant="outline" onClick={() => openDialog('camera')}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Photo
                                    </Button>
                                )}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <Image src={field.url} alt={`Photo ${index + 1}`} width={100} height={100} className="rounded-md aspect-square object-cover" />
                          <div className="flex-1 space-y-2">
                            <FormField
                              control={form.control}
                              name={`photos.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Right wing tip scratch" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {fields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No photos added.</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="pt-6 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Post-Flight</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl">
              <DialogHeader>
                  <DialogTitle>Photo Viewer</DialogTitle>
              </DialogHeader>
              {viewingImageUrl && (
                  <div className="relative h-[80vh]">
                      <Image 
                          src={viewingImageUrl}
                          alt="Checklist Photo" 
                          fill
                          style={{ objectFit: 'contain' }}
                      />
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
