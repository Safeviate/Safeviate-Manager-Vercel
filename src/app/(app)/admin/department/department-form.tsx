'use client';

import { useState } from 'react';
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
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Department } from './page';

interface DepartmentFormProps {
    tenantId: string;
}

export function DepartmentForm({ tenantId }: DepartmentFormProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
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

    try {
        const stored = localStorage.getItem('safeviate.departments');
        const departments = stored ? JSON.parse(stored) as Department[] : [];
        
        const newDept: Department = {
            id: crypto.randomUUID(),
            name: departmentName.trim(),
        };
        
        localStorage.setItem('safeviate.departments', JSON.stringify([...departments, newDept]));
        window.dispatchEvent(new Event('safeviate-departments-updated'));

        toast({
            title: 'Department Added',
            description: `The "${departmentName}" department has been created.`,
        });

        setDepartmentName('');
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create department.' });
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
        setDepartmentName('');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={isMobile ? 'outline' : 'default'}
          size={isMobile ? 'sm' : 'default'}
          className={isMobile ? 'h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100' : 'text-[10px] uppercase font-black px-6 h-10'}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} />
            Add Department
          </span>
          {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
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
              className="col-span-3 font-bold"
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
