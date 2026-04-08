'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SafetyFileAssignment } from '@/types/safety-file';

type PersonnelOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const formSchema = z.object({
  personnelId: z.string().min(1, 'Select a user to assign.'),
  siteRole: z.string().min(1, 'Site role is required.'),
  employerName: z.string().optional(),
});

export function AssignPersonnelDialog({
  projectId,
  personnel,
  assignedPersonnelIds,
  onAssigned,
}: {
  projectId: string;
  personnel: PersonnelOption[];
  assignedPersonnelIds: string[];
  onAssigned?: (assignment: SafetyFileAssignment) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const availablePersonnel = useMemo(
    () => personnel.filter((person) => !assignedPersonnelIds.includes(person.id)),
    [assignedPersonnelIds, personnel]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personnelId: '',
      siteRole: '',
      employerName: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch(`/api/safety-files/${projectId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment: {
            ...values,
            isActive: true,
            assignedAt: new Date().toISOString(),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to assign personnel.');
      }

      onAssigned?.(payload.assignment as SafetyFileAssignment);
      toast({
        title: 'Personnel Assigned',
        description: 'The selected user is now linked to this safety file project.',
      });
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>
          <PlusCircle className="h-3.5 w-3.5" />
          Assign Personnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Personnel To Project</DialogTitle>
          <DialogDescription>
            Pick an existing user from the database and link them to this site so their current
            documents can be reviewed in project context.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="personnelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePersonnel.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.firstName} {person.lastName} - {person.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="siteRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Supervisor, Welder, Site Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer / Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional external employer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={availablePersonnel.length === 0}>
                Save Assignment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
