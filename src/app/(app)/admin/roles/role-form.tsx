
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
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
import { ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RoleCategory } from './page';

interface RoleFormProps {
  tenantId: string;
  existingRole?: {
    id: string;
    name: string;
    category?: RoleCategory;
    permissions: string[];
    requiredDocuments?: string[];
  };
  trigger?: React.ReactNode;
}

const roleCategories: RoleCategory[] = ["Personnel", "Instructor", "Student", "Private Pilot", "External"];

export function RoleForm({ tenantId, existingRole, trigger }: RoleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const [roleName, setRoleName] = useState(existingRole?.name || '');
  const [roleCategory, setRoleCategory] = useState<RoleCategory>(existingRole?.category || 'Personnel');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(existingRole?.permissions || []);
  const [isOpen, setIsOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Required Documents state
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(existingRole?.requiredDocuments || []);
  const [currentDocument, setCurrentDocument] = useState('');

  const canManagePermissions = hasPermission('admin-permissions-manage');

  useEffect(() => {
    if (isOpen) {
      setRoleName(existingRole?.name || '');
      setRoleCategory(existingRole?.category || 'Personnel');
      setSelectedPermissions(existingRole?.permissions || []);
      setRequiredDocuments(existingRole?.requiredDocuments || []);
    }
  }, [isOpen, existingRole]);

  const allPermissionIds = useMemo(() => 
    permissionsConfig.flatMap(resource => 
      resource.actions.map(action => `${resource.id}-${action}`)
    ),
  []);

  const areAllSelected = useMemo(() => 
    allPermissionIds.length > 0 && selectedPermissions.length === allPermissionIds.length,
    [selectedPermissions, allPermissionIds]
  );
  
  const resetForm = () => {
    if (!existingRole) {
      setRoleName('');
      setRoleCategory('Personnel');
      setSelectedPermissions([]);
      setRequiredDocuments([]);
    }
    setCurrentDocument('');
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  }

  const handleSaveRole = async () => {
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

    const roleData = {
        name: roleName,
        category: roleCategory,
        permissions: selectedPermissions,
        requiredDocuments,
    };

    if (existingRole) {
      const roleRef = doc(firestore, 'tenants', tenantId, 'roles', existingRole.id);
      try {
        await updateDoc(roleRef, roleData);
        toast({
          title: 'Role Updated',
          description: `The "${roleName}" role has been updated.`,
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'The role could not be updated. Please try again.',
        });
        return;
      }
    } else {
      const rolesRef = collection(firestore, 'tenants', tenantId, 'roles');
      try {
        await addDoc(rolesRef, roleData);
        toast({
          title: 'Role Added',
          description: `The "${roleName}" role has been created.`,
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'The role could not be created. Please try again.',
        });
        return;
      }
    }
    
    setIsOpen(false);
  };

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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant={isMobile ? 'outline' : 'default'}
            size={isMobile ? 'sm' : 'default'}
            className={isMobile ? 'h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100' : undefined}
          >
            <span className="flex items-center gap-2">
              <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} />
              Add Role
            </span>
            {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{existingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          <DialogDescription>
            {existingRole ? 'Update the details and permissions for this role.' : 'Define a new role, assign permissions, and specify required documents.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='max-h-[70vh] pr-6'>
            <div className="flex flex-col gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Role Name</Label>
                        <Input
                            id="name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="e.g., Chief Pilot"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Role Category</Label>
                        <Select onValueChange={(val) => setRoleCategory(val as RoleCategory)} value={roleCategory}>
                            <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {roleCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
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
                                                        id={`role-${existingRole?.id || 'new'}-${permissionId}`}
                                                        checked={selectedPermissions.includes(permissionId)}
                                                        onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)}
                                                        disabled={!canManagePermissions}
                                                    />
                                                    <label
                                                        htmlFor={`role-${existingRole?.id || 'new'}-${permissionId}`}
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
          <Button onClick={handleSaveRole}>{existingRole ? 'Save Changes' : 'Save Role'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
