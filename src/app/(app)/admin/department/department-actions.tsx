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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { usePermissions } from '@/hooks/use-permissions';

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
    <>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEditOpen(true); }}>
                <Pencil className='mr-2 h-4 w-4' /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsDeleteOpen(true); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                 <Trash2 className='mr-2 h-4 w-4' /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Alert Dialog Content */}
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
        
        {/* Edit Dialog Content */}
        <DialogContent className="sm:max-w-[425px]">
          {isEditOpen && (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
