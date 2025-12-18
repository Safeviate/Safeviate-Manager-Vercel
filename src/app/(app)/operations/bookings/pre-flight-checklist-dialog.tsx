'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Camera, FileUp, PlusCircle, Trash2, View } from 'lucide-react';
import { DocumentUploader } from '../../users/personnel/[id]/document-uploader';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PreFlightChecklistDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  booking: Booking;
  aircraft: Aircraft;
  tenantId: string;
}

const photoSchema = z.object({
  url: z.string(),
  description: z.string().min(1, "Description is required."),
});

const preFlightSchema = z.object({
  actualHobbs: z.number({ coerce: true }).min(0, "Hobbs must be positive"),
  actualTacho: z.number({ coerce: true }).min(0, "Tacho must be positive"),
  oil: z.number({ coerce: true }).min(0, "Oil must be positive"),
  fuel: z.number({ coerce: true }).min(0, "Fuel must be positive"),
  documentsChecked: z.array(z.string()).refine(value => value.length > 0, {
    message: "At least one document must be checked.",
  }),
  photos: z.array(photoSchema).min(4, 'A minimum of 4 photos are required.').optional(),
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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const form = useForm<PreFlightFormValues>({
    resolver: zodResolver(preFlightSchema),
    defaultValues: {
      actualHobbs: aircraft.currentHobbs || 0,
      actualTacho: aircraft.currentTacho || 0,
      oil: '' as any,
      fuel: '' as any,
      documentsChecked: [],
      photos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "photos",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        actualHobbs: aircraft.currentHobbs || 0,
        actualTacho: aircraft.currentTacho || 0,
        oil: '' as any,
        fuel: '' as any,
        documentsChecked: [],
        photos: [],
      });
    }
  }, [isOpen, aircraft, form]);


  const onSubmit = async (values: PreFlightFormValues) => {
    if (!booking || !firestore) return;

    try {
      await updateBooking({
        firestore,
        tenantId,
        bookingId: booking.id,
        updateData: { preFlight: values },
        aircraft,
      });
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
            <DialogTitle>Pre-Flight Checklist</DialogTitle>
            <DialogDescription>
              For Booking #{booking.bookingNumber} - Aircraft {aircraft.tailNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <ScrollArea className="h-[70vh] pr-6">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="actualHobbs" render={({ field }) => ( <FormItem><FormLabel>Actual Hobbs</FormLabel><FormControl><Input type="number" placeholder="Enter Hobbs reading" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="actualTacho" render={({ field }) => ( <FormItem><FormLabel>Actual Tacho</FormLabel><FormControl><Input type="number" placeholder="Enter Tacho reading" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="oil" render={({ field }) => ( <FormItem><FormLabel>Oil (lts)</FormLabel><FormControl><Input type="number" placeholder="Enter oil quantity" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="fuel" render={({ field }) => ( <FormItem><FormLabel>Fuel (lts)</FormLabel><FormControl><Input type="number" placeholder="Enter fuel quantity" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />
                
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
                
                <Separator />
                
                <div className="space-y-4">
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
                                  <Input placeholder="e.g., Left main gear tire" {...field} />
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
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Pre-Flight</Button>
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
