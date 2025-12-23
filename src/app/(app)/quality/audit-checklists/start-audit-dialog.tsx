'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityAudit, QualityAuditChecklistTemplate } from '@/types/quality';
import type { Department } from '../../admin/department/page';
import type { Personnel } from '../../users/personnel/page';

const formSchema = z.object({
  auditeeId: z.string().min(1, 'Auditee is required.'),
  scope: z.string().min(1, 'Scope is required.'),
  auditDate: z.date({ required_error: 'Audit date is required.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface StartAuditDialogProps {
  template: QualityAuditChecklistTemplate;
  tenantId: string;
  personnel: Personnel[];
  departments: Department[];
  trigger?: React.ReactNode;
}

export function StartAuditDialog({
  template,
  tenantId,
  personnel,
  departments,
  trigger,
}: StartAuditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAuditId, setNewAuditId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auditeeId: '',
      scope: '',
      auditDate: new Date(),
    },
  });
  
  useEffect(() => {
    // When the dialog closes, if we have a new audit ID, navigate.
    if (!isOpen && newAuditId) {
      router.push(`/quality/audits/${newAuditId}`);
      setNewAuditId(null); // Reset for next time
    }
  }, [isOpen, newAuditId, router]);


  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const auditsRef = collection(firestore, `tenants/${tenantId}/quality-audits`);
        const counterRef = doc(firestore, `tenants/${tenantId}/counters`, 'audits');

        const createdAuditId = await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const newCount = (counterDoc.data()?.currentNumber || 0) + 1;
            const newAuditNumber = `AUD-${String(newCount).padStart(4, '0')}`;
            
            transaction.set(counterRef, { currentNumber: newCount }, { merge: true });

            const newAuditRef = doc(auditsRef);
            const newAuditData: Omit<QualityAudit, 'id'> = {
                templateId: template.id,
                title: template.title,
                auditNumber: newAuditNumber,
                auditorId: user.uid,
                auditeeId: values.auditeeId,
                scope: values.scope,
                auditDate: values.auditDate.toISOString(),
                status: 'Scheduled',
                findings: [],
            };
            transaction.set(newAuditRef, newAuditData);
            return newAuditRef.id;
        });
        
        setNewAuditId(createdAuditId);

        toast({ title: 'Audit Started', description: `A new audit based on "${template.title}" has been created.` });
        
        // Close the dialog, the useEffect will handle navigation.
        setIsOpen(false);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to start audit', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const auditeeOptions = [...departments, ...personnel];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {trigger ? (
            <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : (
            <DialogTrigger asChild>
                <Button><PlayCircle className='mr-2 h-4 w-4' /> Start Audit</Button>
            </DialogTrigger>
        )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Audit</DialogTitle>
          <DialogDescription>
            Using template: &quot;{template.title}&quot;
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="auditeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auditee (Department or Person)</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select who is being audited" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {auditeeOptions.map(opt => (
                                <SelectItem key={opt.id} value={opt.id}>
                                    {'firstName' in opt ? `${opt.firstName} ${opt.lastName}` : opt.name}
                                </SelectItem>
                           ))}
                        </SelectContent>
                   </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="scope" render={({ field }) => ( <FormItem><FormLabel>Audit Scope</FormLabel><FormControl><Input placeholder="e.g., Q2 Maintenance Procedures" {...field} /></FormControl><FormMessage /></FormItem> )} />
             <FormField
                control={form.control}
                name="auditDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date of Audit</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <CustomCalendar
                            selectedDate={field.value}
                            onDateSelect={field.onChange}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
             />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Starting..." : "Start Audit"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
