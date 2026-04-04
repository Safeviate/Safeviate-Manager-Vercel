'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Pencil, Timer, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

const formSchema = z.object({
  currentHobbs: z.coerce.number().min(0, 'Hours cannot be negative.'),
  currentTacho: z.coerce.number().min(0, 'Hours cannot be negative.'),
});

interface EditHoursDialogProps {
  aircraft: Aircraft;
}

export function EditHoursDialog({ aircraft }: EditHoursDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentHobbs: aircraft.currentHobbs || 0,
      currentTacho: aircraft.currentTacho || 0,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    try {
        const stored = localStorage.getItem('safeviate.aircrafts');
        if (!stored) return;
        const aircrafts = JSON.parse(stored) as Aircraft[];
        
        const nextAircrafts = aircrafts.map(a => a.id === aircraft.id ? { ...a, ...values } : a);
        localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({
          title: 'Mechanical Counters Adjusted',
          description: `Hobbs and Tacho readings for ${aircraft.tailNumber} have been synchronized.`,
        });
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Synchronization Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 border-2 hover:bg-muted/50 shadow-sm">
          <Pencil className="h-3.5 w-3.5" /> Correct Hour Metres
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-3xl border-2 shadow-2xl">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Counter Correction</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Manually adjust the current Hobbs and Tacho readings for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-8">
            <div className="grid grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="currentHobbs"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Timer className="h-3 w-3 text-primary" />
                        Current Hobbs
                    </FormLabel>
                    <FormControl>
                        <Input className="h-12 font-mono font-black text-lg bg-muted/5" type="number" step="0.1" {...field} />
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Gauge className="h-3 w-3 text-primary" />
                        Current Tacho
                    </FormLabel>
                    <FormControl>
                        <Input className="h-12 font-mono font-black text-lg bg-muted/5" type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="p-4 rounded-2xl border-2 border-dashed bg-amber-50/30 text-center">
                <p className="text-[10px] font-bold uppercase text-amber-800 leading-relaxed">
                    Note: Adjusting these counters will affect maintenance interval calculations across the entire system.
                </p>
            </div>

            <DialogFooter className="pt-2 border-t flex flex-row gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1 text-[10px] font-black uppercase">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="flex-1 text-[10px] font-black uppercase shadow-lg">Commit Adjustments</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
