'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
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
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, EditActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface Department {
    id: string;
    name: string;
}

interface DepartmentActionsProps {
  tenantId: string;
  department: Department;
}

export function DepartmentActions({ tenantId, department }: DepartmentActionsProps) {
  const firestore = useFirestore();
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

    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const departmentRef = doc(firestore, 'tenants', tenantId, 'departments', department.id);
    updateDocumentNonBlocking(departmentRef, { name: departmentName });

    toast({
        title: 'Department Updated',
        description: `The department has been renamed to "${departmentName}".`,
    });
    
    setIsEditOpen(false);
  };

  const handleDeleteDepartment = () => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const departmentRef = doc(firestore, 'tenants', tenantId, 'departments', department.id);
    deleteDocumentNonBlocking(departmentRef);

    toast({
        title: 'Department Deleted',
        description: `The "${department.name}" department is being deleted.`,
    });
    setIsDeleteOpen(false);
  }

  return (
    <div className="flex max-w-full items-center justify-end gap-2">
      {/* Action Buttons */}
      <ViewActionButton onClick={() => setIsViewOpen(true)} label="View" />

      <EditActionButton onClick={() => setIsEditOpen(true)} label="Edit department" />

      <DeleteActionButton
        description={`This will permanently delete the "${department.name}" department.`}
        onDelete={() => setIsDeleteOpen(true)}
        srLabel="Delete department"
      />

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>View Department</DialogTitle>
            <DialogDescription>
              Details for the selected department.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold">Name</Label>
              <div className="col-span-3 text-sm">{department.name}</div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog Content */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                  Update the name for the &quot;{department.name}&quot; department.
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
              />
              </div>
          </div>
          <DialogFooter>
              <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateDepartment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog Content */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the 
                      &quot;{department.name}&quot; department.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteDepartment} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
