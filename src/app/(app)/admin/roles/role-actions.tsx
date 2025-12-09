
'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, collection, query } from 'firebase/firestore';
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
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';

interface Role {
    id: string;
    name: string;
    permissions: string[];
}

interface RoleActionsProps {
  tenantId: string;
  role: Role;
}

type Permission = {
    id: string;
    name: string;
    description: string;
};

type GroupedPermission = {
    groupLabel: string;
    permissions: Permission[];
};


export function RoleActions({ tenantId, role }: RoleActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [roleName, setRoleName] = useState(role.name);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions || []);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const permissionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'permissions')) : null),
    [firestore, tenantId]
  );
  const { data: permissions, isLoading: isLoadingPermissions } = useCollection<Permission>(permissionsQuery);

  const groupedPermissions = useMemo(() => {
    if (!permissions) return [];
  
    const permissionMap = new Map(permissions.map(p => [p.id, p]));
    const allMenuItems = [...menuConfig, settingsMenuItem];
  
    return allMenuItems.map(mainItem => {
      const group: GroupedPermission = {
        groupLabel: mainItem.label,
        permissions: [],
      };
  
      // Add main permission if it exists
      const mainPermission = permissionMap.get(mainItem.href);
      if (mainPermission) {
        group.permissions.push(mainPermission);
      }
  
      // Add sub-permissions if they exist
      if (mainItem.subItems) {
        mainItem.subItems.forEach(subItem => {
          const subPermission = permissionMap.get(subItem.href);
          if (subPermission) {
            group.permissions.push(subPermission);
          }
        });
      }
  
      return group;
    }).filter(group => group.permissions.length > 0); // Filter out empty groups
  
  }, [permissions]);


  useEffect(() => {
    // Only reset state when the dialog is opened, not on every re-render of the parent
    if (isEditDialogOpen) {
        setRoleName(role.name);
        setSelectedPermissions(role.permissions || []);
    }
  }, [role, isEditDialogOpen]);

  const handleUpdateRole = () => {
    if (!roleName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Field',
        description: 'Please enter a role name.',
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

    const roleRef = doc(firestore, 'tenants', tenantId, 'roles', role.id);
    updateDocumentNonBlocking(roleRef, { name: roleName, permissions: selectedPermissions });

    toast({
        title: 'Role Updated',
        description: `The role "${roleName}" is being updated.`,
    });
    
    setIsEditDialogOpen(false);
  };

  const handleDeleteRole = () => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const roleRef = doc(firestore, 'tenants', tenantId, 'roles', role.id);
    deleteDocumentNonBlocking(roleRef);

    toast({
        title: 'Role Deleted',
        description: `The "${role.name}" role is being deleted.`,
    });
  }

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };


  return (
    <>
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialog>
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
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        <Pencil className='mr-2' /> Edit
                    </DropdownMenuItem>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className='mr-2' /> Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog Content */}
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                    <DialogDescription>
                        Update the details for the &quot;{role.name}&quot; role.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Role Name</Label>
                        <Input
                            id="name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                        />
                    </div>

                    <Separator />

                    <div className='space-y-4'>
                        <Label>Permissions</Label>
                        <ScrollArea className="h-72 w-full rounded-md border">
                            <div className="p-4">
                                {isLoadingPermissions && <p className='text-center'>Loading permissions...</p>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                {groupedPermissions.map((group) => (
                                    <div key={group.groupLabel} className='space-y-2 break-inside-avoid'>
                                        <h4 className='font-medium border-b pb-1'>{group.groupLabel}</h4>
                                        <div className="flex flex-col gap-2">
                                        {group.permissions.map((permission) => (
                                            <div
                                                key={permission.id}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={`edit-${permission.id}`}
                                                    checked={selectedPermissions.includes(permission.id)}
                                                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                                                />
                                                <label
                                                    htmlFor={`edit-${permission.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {permission.name}
                                                </label>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleUpdateRole}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>

             {/* Delete Alert Dialog Content */}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the 
                        &quot;{role.name}&quot; role.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRole} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Dialog>
    </>
  );
}
