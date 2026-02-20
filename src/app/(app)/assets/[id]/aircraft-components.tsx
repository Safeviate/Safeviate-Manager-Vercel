
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Textarea } from '@/components/ui/textarea';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  // Form state for the dialog
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installDate, setInstallDate] = useState<Date | undefined>(undefined);
  const [installHours, setInstallHours] = useState<number | string>('');
  const [maxHours, setMaxHours] = useState<number | string>('');
  const [tsn, setTsn] = useState<number | string>('');
  const [tso, setTso] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (aircraft?.components) {
      setComponents(aircraft.components);
    }
  }, [aircraft]);

  const resetForm = () => {
    setName('');
    setPartNumber('');
    setSerialNumber('');
    setInstallDate(undefined);
    setInstallHours('');
    setMaxHours('');
    setTsn('');
    setTso('');
    setNotes('');
  };

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    if (component) {
      setEditingComponent(component);
      setName(component.name);
      setPartNumber(component.partNumber);
      setSerialNumber(component.serialNumber || '');
      setInstallDate(component.installDate ? new Date(component.installDate) : undefined);
      setInstallHours(component.installHours ?? '');
      setMaxHours(component.maxHours ?? '');
      setTsn(component.tsn ?? '');
      setTso(component.tso ?? '');
      setNotes(component.notes || '');
    } else {
      setEditingComponent(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingComponent(null);
    resetForm();
  }

  const onSubmit = () => {
    if (!firestore) return;
    
    let updatedComponents: AircraftComponent[];
    const newComponentData = {
        id: editingComponent ? editingComponent.id : uuidv4(),
        name,
        partNumber,
        serialNumber,
        installDate: installDate ? installDate.toISOString() : '',
        installHours: Number(installHours) || 0,
        maxHours: Number(maxHours) || 0,
        tsn: Number(tsn) || 0,
        tso: Number(tso) || 0,
        notes,
    };

    if (editingComponent) {
      updatedComponents = components.map(c => c.id === editingComponent.id ? newComponentData : c);
    } else {
      updatedComponents = [...components, newComponentData];
    }
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };

  const handleDeleteComponent = () => {
    if (!componentToDelete || !firestore) return;
    const updatedComponents = components.filter(c => c.id !== componentToDelete.id);
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Deleted' });
    setComponentToDelete(null);
  };
  
  if (!aircraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>Trackable components installed on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading component data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Components</CardTitle>
              <CardDescription>Trackable components installed on this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Installed</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).length > 0 ? (
                aircraft.components?.map(component => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>
                      {component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}
                      {component.installHours && ` @ ${component.installHours} hrs`}
                    </TableCell>
                    <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(component)}><Edit className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" onClick={() => setComponentToDelete(component)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Component Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partNumber">Part Number</Label>
                <Input id="partNumber" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="installDate">Install Date</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal", !installDate && "text-muted-foreground")}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {installDate ? format(installDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}>
                          <CustomCalendar
                              selectedDate={installDate}
                              onDateSelect={(date) => {
                                if (date) {
                                    setInstallDate(date);
                                }
                              }}
                          />
                      </PopoverContent>
                  </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installHours">Install Hours</Label>
                <Input id="installHours" type="number" value={installHours} onChange={(e) => setInstallHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHours">Max Hours</Label>
                <Input id="maxHours" type="number" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="tsn">TSN (Time Since New)</Label>
                <Input id="tsn" type="number" value={tsn} onChange={(e) => setTsn(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="tso">TSO (Time Since Overhaul)</Label>
                <Input id="tso" type="number" value={tso} onChange={(e) => setTso(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={onSubmit}>{editingComponent ? 'Save Changes' : 'Save Component'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the component &quot;{componentToDelete?.name}&quot;.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteComponent}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
