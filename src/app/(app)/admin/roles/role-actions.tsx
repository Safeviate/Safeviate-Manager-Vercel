'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { ChevronsUpDown, Eye, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';

interface Role {
    id: string;
    name: string;
    permissions: string[];
    requiredDocuments?: string[];
}

interface RoleActionsProps {
  tenantId: string;
  role: Role;
}

export function RoleActions({ tenantId, role }: RoleActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [roleName, setRoleName] = useState(role.name);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions || []);
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(role.requiredDocuments || []);
  const [currentDocument, setCurrentDocument] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const canManageRoles = hasPermission('admin-roles-manage');
  const canManagePermissions = hasPermission('admin-permissions-manage');

  const onOpenChange = (open: boolean) => {
    if (!open) {
        // Reset form state when dialog closes
        setRoleName(role.name);
        setSelectedPermissions(role.permissions || []);
        setRequiredDocuments(role.requiredDocuments || []);
        setCurrentDocument('');
    }
    setIsEditDialogOpen(open);
  }

  const allPermissionIds = useMemo(() => 
    permissionsConfig.flatMap(resource => 
      resource.actions.map(action => `${resource.id}-${action}`)
    ),
  []);

  const areAllSelected = useMemo(() => 
    allPermissionIds.length > 0 && selectedPermissions.length === allPermissionIds.length,
    [selectedPermissions, allPermissionIds]
  );
  
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
    updateDocumentNonBlocking(roleRef, { name: roleName, permissions: selectedPermissions, requiredDocuments });

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
    setIsDeleteDialogOpen(false);
  }

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setSelectedPermissions((prev) =>
      checked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)
    );
  };

  const handleSelectAllToggle = () => {
    if (areAllSelected) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPermissionIds);
    }
  };

  const handleAddDocument = () => {
    if (currentDocument.trim() && !requiredDocuments.includes(currentDocument.trim())) {
      setRequiredDocuments([...requiredDocuments, currentDocument.trim()]);
      setCurrentDocument('');
    }
  };

  const handleRemoveDocument = (docToRemove: string) => {
    setRequiredDocuments(requiredDocuments.filter(doc => doc !== docToRemove));
  };


  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditDialogOpen(true)}
        disabled={!canManageRoles}
      >
        <Eye className="mr-2 h-4 w-4" />
        View
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsDeleteDialogOpen(true)}
        disabled={!canManageRoles}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <Dialog open={isEditDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          {isEditDialogOpen && (
            <>
              <DialogHeader>
                  <DialogTitle>Role Details</DialogTitle>
                  <DialogDescription>
                      View or update the details for the &quot;{role.name}&quot; role.
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className='max-h-[70vh] pr-6'>
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

                      <div className='space-y-2'>
                          <h4 className="text-md font-medium">Required Documents</h4>
                          <div className="flex items-center gap-2">
                              <Input 
                                  value={currentDocument}
                                  onChange={(e) => setCurrentDocument(e.target.value)}
                                  placeholder="e.g., Pilot's License"
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocument())}
                              />
                              <Button onClick={handleAddDocument} type='button'>Add</Button>
                          </div>
                          <div className="space-y-2 pt-2">
                              {requiredDocuments.map(doc => (
                                  <div key={doc} className='flex items-center justify-between gap-2'>
                                      <Badge variant='secondary'>{doc}</Badge>
                                      <Button size='icon' variant='ghost' className='h-6 w-6' onClick={() => handleRemoveDocument(doc)}>
                                          <Trash2 className='h-4 w-4 text-destructive' />
                                      </Button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <Separator />

                      <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen} className='space-y-2'>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <h4 className="text-md font-medium">Permissions</h4>
                                  <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="w-9 p-0">
                                          <ChevronsUpDown className="h-4 w-4" />
                                          <span className="sr-only">Toggle</span>
                                      </Button>
                                  </CollapsibleTrigger>
                              </div>
                              {canManagePermissions && (
                                  <Button variant="link" onClick={handleSelectAllToggle} className="p-0 h-auto">
                                      {areAllSelected ? 'Deselect All' : 'Select All'}
                                  </Button>
                              )}
                          </div>
                          <CollapsibleContent>
                              <ScrollArea className="h-72 w-full rounded-md border mt-2">
                                  <div className="p-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                      {permissionsConfig.map((resource) => (
                                          <div key={resource.id} className='space-y-2 break-inside-avoid'>
                                              <h4 className='font-medium border-b pb-1'>{resource.name}</h4>
                                              <div className="flex flex-col gap-2 pt-1">
                                              {resource.actions.map((action) => {
                                                  const permissionId = `${resource.id}-${action}`;
                                                  return (
                                                      <div
                                                          key={permissionId}
                                                          className="flex items-center space-x-2"
                                                      >
                                                          <Checkbox
                                                              id={`edit-${permissionId}`}
                                                              checked={selectedPermissions.includes(permissionId)}
                                                              onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)}
                                                              disabled={!canManagePermissions}
                                                          />
                                                          <label
                                                              htmlFor={`edit-${permissionId}`}
                                                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                                                          >
                                                              {action}
                                                          </label>
                                                      </div>
                                                  );
                                              })}
                                              </div>
                                          </div>
                                      ))}
                                      </div>
                                  </div>
                              </ScrollArea>
                          </CollapsibleContent>
                      </Collapsible>
                  </div>
                </ScrollArea>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleUpdateRole}>Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
    </div>
  );
}
