'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, EditActionButton, ViewActionButton } from '@/components/record-action-buttons';
import type { Department } from './page';

interface DepartmentActionsProps {
  tenantId: string;
  department: Department;
}

export function DepartmentActions({ tenantId, department }: DepartmentActionsProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [departmentName, setDepartmentName] = useState(department.name);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const canManage = hasPermission('admin-departments-manage');

  useEffect(() => {
    if (!isEditOpen) {
      setDepartmentName(department.name);
    }
  }, [isEditOpen, department.name]);

  if (!canManage) {
    return null;
  }

  const handleUpdateDepartment = () => {
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
        if (stored) {
            const depts = JSON.parse(stored) as Department[];
            const updatedDepts = depts.map(d => d.id === department.id ? { ...d, name: departmentName.trim() } : d);
            localStorage.setItem('safeviate.departments', JSON.stringify(updatedDepts));
            window.dispatchEvent(new Event('safeviate-departments-updated'));

            toast({
                title: 'Department Updated',
                description: `The department has been renamed to "${departmentName}".`,
            });
            setIsEditOpen(false);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update department.' });
    }
  };

  const handleDeleteDepartment = () => {
    try {
        const stored = localStorage.getItem('safeviate.departments');
        if (stored) {
            const depts = JSON.parse(stored) as Department[];
            const updatedDepts = depts.filter(d => d.id !== department.id);
            localStorage.setItem('safeviate.departments', JSON.stringify(updatedDepts));
            window.dispatchEvent(new Event('safeviate-departments-updated'));

            toast({
                title: 'Department Deleted',
                description: `The "${department.name}" department has been deleted.`,
            });
            setIsDeleteOpen(false);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete department.' });
    }
  }

  return (
    <div className="flex max-w-full items-center justify-end gap-2">
      <ViewActionButton onClick={() => setIsViewOpen(true)} label="View" />
      <EditActionButton onClick={() => setIsEditOpen(true)} label="Edit department" />
      <DeleteActionButton
        description={`This will permanently delete the "${department.name}" department.`}
        onDelete={() => setIsDeleteOpen(true)}
        srLabel="Delete department"
      />

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>View Department</DialogTitle>
            <DialogDescription>Details for the selected department.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground">Name</Label>
              <div className="col-span-3 text-sm font-bold uppercase">{department.name}</div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>Update the name for the &quot;{department.name}&quot; department.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                  id="name"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="col-span-3 font-bold"
              />
              </div>
          </div>
          <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleUpdateDepartment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone. This will permanently delete the &quot;{department.name}&quot; department.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteDepartment} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
