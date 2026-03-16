'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Aircraft } from '@/types/aircraft';

const aircraftFormSchema = z.object({
  tailNumber: z.string().min(1, 'Tail number is required'),
  make: z.string().min(1, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  currentHobbs: z.number({ coerce: true }).min(0),
  currentTacho: z.number({ coerce: true }).min(0),
});

function NewAircraftDialog({ tenantId }: { tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof aircraftFormSchema>>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      tailNumber: '',
      make: '',
      model: '',
      type: 'Single-Engine',
      currentHobbs: 0,
      currentTacho: 0,
    }
  });

  const onSubmit = (values: z.infer<typeof aircraftFormSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
    addDocumentNonBlocking(colRef, {
      ...values,
      engineHours: 0,
      frameHours: 0,
      documents: [],
      components: [],
    });
    toast({ title: 'Aircraft Added', description: `${values.tailNumber} added to fleet.` });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>Enter the technical details for the new fleet asset.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tail Number</Label>
              <Input placeholder="e.g., ZS-XYZ" {...form.register('tailNumber')} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(val) => form.setValue('type', val as any)} defaultValue="Single-Engine">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                  <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input placeholder="e.g., Piper" {...form.register('make')} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input placeholder="e.g., PA-28-181" {...form.register('model')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Hobbs</Label>
              <Input type="number" step="0.1" {...form.register('currentHobbs')} />
            </div>
            <div className="space-y-2">
              <Label>Current Tacho</Label>
              <Input type="number" step="0.1" {...form.register('currentTacho')} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="submit">Save Aircraft</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const { toast } = useToast();

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  const handleDelete = (id: string, tail: string) => {
    if (!firestore || !window.confirm(`Permanently delete ${tail}?`)) return;
    deleteDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, id));
    toast({ title: 'Aircraft Deleted' });
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage technical status and records for all fleet assets.</p>
        </div>
        <NewAircraftDialog tenantId={tenantId} />
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Hobbs</TableHead>
                <TableHead className="text-right">Tacho</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft && aircraft.length > 0 ? (
                aircraft.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{ac.type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="icon" className="h-8 w-8">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ac.id, ac.tailNumber)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No aircraft found in the fleet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
