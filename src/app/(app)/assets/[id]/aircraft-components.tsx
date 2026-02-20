
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
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

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({
  aircraft,
  tenantId,
}: AircraftComponentsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<AircraftComponent | null>(null);

  const openAddDialog = () => {
    setEditingComponent(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (component: AircraftComponent) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };
  
  const openDeleteDialog = (component: AircraftComponent) => {
    setComponentToDelete(component);
    setIsDeleteDialogOpen(true);
  }

  const handleDeleteComponent = () => {
    if (!firestore || !componentToDelete) return;

    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentToDelete.id);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);

    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

    toast({
        title: "Component Deleted",
        description: `"${componentToDelete.name}" has been removed.`
    });

    setIsDeleteDialogOpen(false);
    setComponentToDelete(null);
  }

  return (
    <>
        <Card>
            <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Components</CardTitle>
                <Button onClick={openAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                </Button>
            </div>
            <CardDescription>
                Track and manage all major components of the aircraft.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Part No.</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead>Install Hours</TableHead>
                    <TableHead>Max Hours</TableHead>
                    <TableHead>TSN</TableHead>
                    <TableHead>TSO</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {(aircraft.components || []).length > 0 ? (
                    (aircraft.components || []).map((component) => (
                    <TableRow key={component.id}>
                        <TableCell className="font-medium">{component.name}</TableCell>
                        <TableCell>{component.partNumber}</TableCell>
                        <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                        <TableCell>
                        {component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}
                        </TableCell>
                        <TableCell>{component.installHours || 'N/A'}</TableCell>
                        <TableCell>{component.maxHours || 'N/A'}</TableCell>
                        <TableCell>{component.tsn || 'N/A'}</TableCell>
                        <TableCell>{component.tso || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(component)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(component)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        No components added yet.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>

        {isDialogOpen && (
             <ComponentFormDialog 
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                aircraft={aircraft}
                tenantId={tenantId}
                editingComponent={editingComponent}
             />
        )}
        
        {componentToDelete && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the component &quot;{componentToDelete.name}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteComponent} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </>
  );
}


// --- Component Form Dialog ---
interface ComponentFormDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    aircraft: Aircraft;
    tenantId: string;
    editingComponent: AircraftComponent | null;
}

function ComponentFormDialog({ isOpen, setIsOpen, aircraft, tenantId, editingComponent }: ComponentFormDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<AircraftComponent>>({
        id: editingComponent?.id || uuidv4(),
        name: editingComponent?.name || '',
        partNumber: editingComponent?.partNumber || '',
        serialNumber: editingComponent?.serialNumber || '',
        installDate: editingComponent?.installDate || '',
        installHours: editingComponent?.installHours || undefined,
        maxHours: editingComponent?.maxHours || undefined,
        tsn: editingComponent?.tsn || undefined,
        tso: editingComponent?.tso || undefined,
        notes: editingComponent?.notes || '',
    });

    const handleInputChange = (field: keyof AircraftComponent, value: string | number | undefined) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleSave = () => {
        if (!firestore) return;
        if (!formData.name || !formData.partNumber) {
            toast({
                variant: 'destructive',
                title: 'Missing Fields',
                description: 'Component Name and Part Number are required.'
            });
            return;
        }

        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        const currentComponents = aircraft.components || [];
        
        let updatedComponents;
        if (editingComponent) {
            // Update existing component
            updatedComponents = currentComponents.map(c => c.id === editingComponent.id ? formData : c);
        } else {
            // Add new component
            updatedComponents = [...currentComponents, formData];
        }

        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });

        toast({
            title: editingComponent ? "Component Updated" : "Component Added",
            description: `The component "${formData.name}" has been saved.`
        });

        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
                    <DialogDescription>
                        {editingComponent ? `Editing ${editingComponent.name}` : `Add a new component to ${aircraft.tailNumber}`}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Component Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="partNumber">Part Number</Label>
                            <Input id="partNumber" value={formData.partNumber} onChange={(e) => handleInputChange('partNumber', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="serialNumber">Serial Number</Label>
                            <Input id="serialNumber" value={formData.serialNumber} onChange={(e) => handleInputChange('serialNumber', e.target.value)} />
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Install Date</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen} modal={false}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("justify-start text-left font-normal", !formData.installDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.installDate ? format(new Date(formData.installDate), 'PPP') : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent onInteractOutside={(e) => e.preventDefault()} className="w-auto p-0">
                                    <CustomCalendar
                                        selectedDate={formData.installDate ? new Date(formData.installDate) : undefined}
                                        onDateSelect={(date) => {
                                            if (date) {
                                                handleInputChange('installDate', date.toISOString());
                                            }
                                            setIsDatePickerOpen(false);
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="installHours">Install Hours</Label>
                            <Input id="installHours" type="number" value={formData.installHours || ''} onChange={(e) => handleInputChange('installHours', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxHours">Max Hours</Label>
                            <Input id="maxHours" type="number" value={formData.maxHours || ''} onChange={(e) => handleInputChange('maxHours', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tsn">TSN</Label>
                            <Input id="tsn" type="number" value={formData.tsn || ''} onChange={(e) => handleInputChange('tsn', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tso">TSO</Label>
                            <Input id="tso" type="number" value={formData.tso || ''} onChange={(e) => handleInputChange('tso', Number(e.target.value))} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
