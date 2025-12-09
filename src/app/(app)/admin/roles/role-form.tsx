'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface RoleFormProps {
  tenantId: string;
}

type Permission = {
    id: string;
    name: string;
    description: string;
};

export function RoleForm({ tenantId }: RoleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const permissionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'permissions')) : null),
    [firestore, tenantId]
  );
  const { data: permissions, isLoading } = useCollection<Permission>(permissionsQuery);

  const handleAddRole = () => {
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

    const rolesRef = collection(firestore, 'tenants', tenantId, 'roles');
    addDocumentNonBlocking(rolesRef, { name: roleName, permissions: selectedPermissions });

    toast({
      title: 'Role Added',
      description: `The "${roleName}" role is being created.`,
    });

    setRoleName('');
    setSelectedPermissions([]);
    setIsOpen(false);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>
            Define a new role and assign permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                    id="name"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g., Chief Pilot"
                />
            </div>

            <Separator />

            <div className='space-y-2'>
                <Label>Permissions</Label>
                <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {isLoading && <p>Loading permissions...</p>}
                        {permissions?.map((permission) => (
                        <div
                            key={permission.id}
                            className="flex items-center space-x-2 mb-2"
                        >
                            <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor={permission.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {permission.name}
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    {permission.description}
                                </p>
                            </div>
                        </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddRole}>Save Role</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
