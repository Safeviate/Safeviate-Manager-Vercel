
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
import { permissionsConfig, type PermissionResource } from '@/lib/permissions-config';

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
    resource: string;
    action: string;
};

type GroupedPermission = {
    resource: PermissionResource;
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
  const { data: allPermissions, isLoading: isLoadingPermissions } = useCollection<Permission>(permissionsQuery);

  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return [];

    const permissionMap = new Map(allPermissions.map(p => [p.id, p]));
    
    return permissionsConfig.map(resource => {
        const group: GroupedPermission = {
            resource: resource,
            permissions: [],
        };

        resource.actions.forEach(action => {
            const permId = `${resource.id}-${action}`;
            const permission = permissionMap.get(permId);
            if (permission) {
                group.permissions.push(permission);
            }
        });
        
        return group;
    }).filter(group => group.permissions.length > 0);

  }, [allPermissions]);


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
                                    <div key={group.resource.id} className='space-y-2 break-inside-avoid'>
                                        <h4 className='font-medium border-b pb-1'>{group.resource.name}</h4>
                                        <div className="flex flex-col gap-2 pt-1">
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
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                                                >
                                                    {permission.action}
                                                </label>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                ))}
                                </div>
                                {!isLoadingPermissions && groupedPermissions.length === 0 && (
                                    <p className="text-center text-muted-foreground">
                                        No permissions found. Please seed the database from the Admin/Database page.
                                    </p>
                                )}
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
