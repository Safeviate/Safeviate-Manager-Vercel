
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Aircraft, MaintenanceLog } from '@/types/aircraft';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';

const snagSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  procedure: z.string().optional(),
});

type SnagFormValues = z.infer<typeof snagSchema>;

interface NewSnagFormProps {
  aircraftId: string;
  tenantId: string;
  onSnagAdded: () => void;
}

function NewSnagForm({ aircraftId, tenantId, onSnagAdded }: NewSnagFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<SnagFormValues>({
    resolver: zodResolver(snagSchema),
    defaultValues: {
      description: '',
      procedure: '',
    },
  });

  const onSubmit = async (values: SnagFormValues) => {
    if (!firestore) return;

    const newSnag: MaintenanceLog = {
      id: uuidv4(),
      aircraftId: aircraftId,
      date: new Date().toISOString(),
      description: values.description,
      procedure: values.procedure || '',
    };

    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    await updateDocumentNonBlocking(aircraftRef, {
      maintenanceLogs: arrayUnion(newSnag)
    });

    toast({ title: 'Snag Added', description: 'The new maintenance snag has been logged.' });
    setIsOpen(false);
    onSnagAdded();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Snag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Maintenance Snag</DialogTitle>
          <DialogDescription>Log a new issue or maintenance task for this aircraft.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Snag / Issue Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the issue found..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="procedure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rectification / Procedure</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the steps taken to fix the issue (optional)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Snag</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


interface AircraftSnagsProps {
  aircraft: Aircraft | null;
  tenantId: string;
  onUpdate: () => void;
}

export function AircraftSnags({ aircraft, tenantId, onUpdate }: AircraftSnagsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  if (!aircraft) {
      return (
          <div className="p-4">
              <Skeleton className="h-48 w-full" />
          </div>
      );
  }

  const handleDeleteSnag = async (snagToDelete: MaintenanceLog) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    await updateDocumentNonBlocking(aircraftRef, {
        maintenanceLogs: arrayRemove(snagToDelete)
    });
    toast({ title: 'Snag Removed', description: 'The snag has been removed from the log.'});
    onUpdate();
  }

  const sortedLogs = [...(aircraft.maintenanceLogs || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
        <div className="flex justify-end mb-4">
            <NewSnagForm aircraftId={aircraft.id} tenantId={tenantId} onSnagAdded={onUpdate} />
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-[40%]">Procedure</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedLogs.length > 0 ? (
                    sortedLogs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                            <TableCell className="whitespace-pre-wrap">{log.description}</TableCell>
                            <TableCell className="whitespace-pre-wrap">{log.procedure || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSnag(log)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">No snags or maintenance logs recorded.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}
