'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/use-user-profile';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityAudit, QualityAuditChecklistTemplate, ExternalOrganization } from '@/types/quality';
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
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAuditId, setNewAuditId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);

  useEffect(() => {
    if (isOpen) {
        const storedOrgs = localStorage.getItem('safeviate.external-organizations');
        if (storedOrgs) setOrganizations(JSON.parse(storedOrgs));
    }
  }, [isOpen]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      auditeeId: '',
      scope: '',
      auditDate: new Date(),
    },
  });
  
  useEffect(() => {
    if (!isOpen && newAuditId) {
      router.push(`/quality/audits/${newAuditId}`);
      setNewAuditId(null);
    }
  }, [isOpen, newAuditId, router]);


  const onSubmit = async (values: FormValues) => {
    if (!userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'User session not found.' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const storedAudits = localStorage.getItem('safeviate.quality-audits');
        const auditsList = storedAudits ? JSON.parse(storedAudits) as QualityAudit[] : [];
        
        // Simple counter logic (for local storage, we can just use the length or a separate counter)
        const nextCount = auditsList.length + 1;
        const newAuditNumber = `AUD-${String(nextCount).padStart(4, '0')}`;
        
        // Detect if auditee is an external organization
        const isExternalOrg = organizations?.some(org => org.id === values.auditeeId);

        const createdId = crypto.randomUUID();
        const newAuditData: QualityAudit = {
            id: createdId,
            templateId: template.id,
            title: template.title,
            auditNumber: newAuditNumber,
            auditorId: userProfile.id,
            auditeeId: values.auditeeId,
            organizationId: isExternalOrg ? values.auditeeId : null,
            scope: values.scope,
            auditDate: values.auditDate.toISOString(),
            status: 'Scheduled',
            findings: [],
        };

        localStorage.setItem('safeviate.quality-audits', JSON.stringify([newAuditData, ...auditsList]));
        
        setNewAuditId(createdId);
        toast({ title: 'Audit Started' });
        
        window.dispatchEvent(new Event('safeviate-quality-updated'));
        setIsOpen(false);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to start audit', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

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
          <DialogDescription>Using template: &quot;{template.title}&quot;</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="auditeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auditee</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectGroup>
                               <SelectLabel>Internal Departments</SelectLabel>
                               {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                               ))}
                           </SelectGroup>
                           <SelectGroup>
                               <SelectLabel>External Organizations</SelectLabel>
                               {(organizations || []).map(org => (
                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                               ))}
                           </SelectGroup>
                           <SelectGroup>
                               <SelectLabel>Personnel</SelectLabel>
                               {personnel.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                                ))}
                           </SelectGroup>
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
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Starting..." : "Start Audit"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
