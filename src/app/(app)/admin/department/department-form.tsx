'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface DepartmentFormProps {
    tenantId: string;
}

export function DepartmentForm({ tenantId }: DepartmentFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [departmentName, setDepartmentName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddDepartment = () => {
    if (!departmentName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Field',
        description: 'Please enter a department name.',
      });
      return;
    }

    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const departmentsRef = collection(firestore, 'tenants', tenantId, 'departments');
    
    addDocumentNonBlocking(departmentsRef, { name: departmentName });

    toast({
        title: 'Department Added',
        description: `The "${departmentName}" department is being created.`,
    });

    setDepartmentName('');
    setIsOpen(false);
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
        // Reset form state when dialog closes
        setDepartmentName('');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
          <DialogDescription>
            Enter the name for the new department below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Flight Operations"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddDepartment}>Save Department</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
