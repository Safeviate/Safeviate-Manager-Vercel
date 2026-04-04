'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
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
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import type { Workpack } from '@/types/workpack';

const formSchema = z.object({
  aircraftId: z.string().min(1, 'Aircraft reference is required.'),
  title: z.string().min(1, 'Title or scope description is required.'),
  description: z.string().optional(),
});

export function AddWorkpackDialog({ tenantId }: { tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aircraftId: '',
      title: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const stored = localStorage.getItem('safeviate.maintenance-workpacks');
      const current = stored ? JSON.parse(stored) as Workpack[] : [];
      
      const datePrefix = format(new Date(), 'yyMM');
      const trackingNumber = `WP-${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newWorkpack: Workpack = {
        ...values,
        id: crypto.randomUUID(),
        trackingNumber,
        status: 'OPEN',
        openedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('safeviate.maintenance-workpacks', JSON.stringify([newWorkpack, ...current]));
      window.dispatchEvent(new Event('safeviate-maintenance-workpacks-updated'));
      
      toast({
        title: 'Workpack Initiated',
        description: `Workpack ${trackingNumber} opened. You can now add task cards.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
       toast({
        title: 'Error',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isMobile ? 'outline' : 'default'}
          size={isMobile ? 'sm' : 'default'}
          className={isMobile ? 'h-9 w-full justify-between border-input bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-accent/40' : 'w-full sm:w-auto shadow-md gap-2 h-9 px-6 text-xs font-black uppercase'}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> Open Workpack
          </span>
          {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Initiate Workpack</DialogTitle>
          <DialogDescription>Open a new maintenance workpack against an aircraft.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="aircraftId" render={({ field }) => (
              <FormItem><FormLabel>Aircraft Registration</FormLabel><FormControl><Input placeholder="e.g. ZS-XYZ" {...field} className="uppercase font-mono" /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Work Scope / Title</FormLabel><FormControl><Input placeholder="e.g. 100-Hour Inspection" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea className="resize-none" rows={3} placeholder="Describe any special considerations..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Open Workpack</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
