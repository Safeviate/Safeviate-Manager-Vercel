
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

const componentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Component name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  serialNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).optional(),
  maxHours: z.number({ coerce: true }).optional(),
  tsn: z.number({ coerce: true }).optional(),
  tso: z.number({ coerce: true }).optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
  });

  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft.components]);

  const handleOpenDialog = () => {
    form.reset({
        name: '',
        partNumber: '',
        serialNumber: '',
        installHours: undefined,
        maxHours: undefined,
        tsn: undefined,
        tso: undefined,
    });
    setEditingComponent(null);
    setIsDialogOpen(true);
  };
  
  const onSubmit = (values: ComponentFormValues) => {
    console.log("Form submitted (not saved yet):", values);
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Component
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Part No.</TableHead>
            <TableHead>Serial No.</TableHead>
            <TableHead>Max Hours</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(components || []).map((component) => (
            <TableRow key={component.id}>
              <TableCell>{component.name}</TableCell>
              <TableCell>{component.partNumber}</TableCell>
              <TableCell>{component.serialNumber || 'N/A'}</TableCell>
              <TableCell>{component.maxHours?.toString() || 'N/A'}</TableCell>
              <TableCell>{component.tsn?.toString() || 'N/A'}</TableCell>
              <TableCell>{component.tso?.toString() || 'N/A'}</TableCell>
              <TableCell className="text-right">
                {/* Actions will be added later */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {components.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
              No components added yet.
          </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
            <DialogDescription>
              Fill in the details for the new component.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Component Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="installHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Install Hours</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Hours</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="tsn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TSN (Time Since New)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TSO (Time Since Overhaul)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Add Component</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
