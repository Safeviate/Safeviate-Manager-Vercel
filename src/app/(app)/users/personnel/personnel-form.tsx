'use client';

import { useState, useMemo, useEffect } from 'react';
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
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Role } from '../roles/page';
import type { Department } from '../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PersonnelFormProps {
  tenantId: string;
  roles: Role[];
  departments: Department[];
}

export function PersonnelForm({ tenantId, roles, departments }: PersonnelFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: '' });
  const [emergencyContact, setEmergencyContact] = useState({ name: '', relationship: '', phone: '' });
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const allPermissionIds = useMemo(() => 
    permissionsConfig.flatMap(resource => 
      resource.actions.map(action => `${resource.id}-${action}`)
    ),
  []);

  const areAllSelected = useMemo(() => 
    allPermissionIds.length > 0 && selectedPermissions.length === allPermissionIds.length,
    [selectedPermissions, allPermissionIds]
  );
  
  useEffect(() => {
    if (selectedRole) {
      setSelectedPermissions(selectedRole.permissions || []);
    } else {
      setSelectedPermissions([]);
    }
  }, [selectedRole]);


  const handleAddPersonnel = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'First Name, Last Name, Email, and Role are required.',
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

    const personnelRef = collection(firestore, 'tenants', tenantId, 'personnel');
    addDocumentNonBlocking(personnelRef, { 
        firstName, 
        lastName, 
        email,
        contactNumber,
        address,
        emergencyContact,
        department: selectedDepartment?.id || null,
        role: selectedRole.id, 
        permissions: selectedPermissions 
    });

    toast({
      title: 'Personnel Added',
      description: `User ${firstName} ${lastName} is being created.`,
    });

    resetForm();
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setContactNumber('');
    setAddress({ street: '', city: '', state: '', postalCode: '', country: '' });
    setEmergencyContact({ name: '', relationship: '', phone: '' });
    setSelectedDepartment(null);
    setSelectedRole(null);
    setSelectedPermissions([]);
    setIsOpen(false);
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

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setSelectedRole(role || null);
  }

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    setSelectedDepartment(dept || null);
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            resetForm();
        }
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Personnel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Personnel</DialogTitle>
          <DialogDescription>
            Create a new user, assign a role, and customize their permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select onValueChange={handleDepartmentChange} value={selectedDepartment?.id}>
                        <SelectTrigger id="department">
                            <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select onValueChange={handleRoleChange} value={selectedRole?.id}>
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator />
            <h4 className="text-md font-medium">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-3">
                    <Label htmlFor="street">Street</Label>
                    <Input id="street" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input id="state" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" value={address.postalCode} onChange={(e) => setAddress({...address, postalCode: e.target.value})} />
                </div>
                    <div className="space-y-2 col-span-3">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={address.country} onChange={(e) => setAddress({...address, country: e.target.value})} />
                </div>
            </div>

            <Separator />
            <h4 className="text-md font-medium">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="emergencyName">Full Name</Label>
                    <Input id="emergencyName" value={emergencyContact.name} onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergencyRelationship">Relationship</Label>
                    <Input id="emergencyRelationship" value={emergencyContact.relationship} onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Phone Number</Label>
                    <Input id="emergencyPhone" value={emergencyContact.phone} onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
                </div>
            </div>

            <Separator />

            <div className='space-y-2'>
                <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <Button variant="link" onClick={handleSelectAllToggle} className="p-0 h-auto">
                        {areAllSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>
                <ScrollArea className="h-72 w-full rounded-md border">
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
                                                id={`add-${permissionId}`}
                                                checked={selectedPermissions.includes(permissionId)}
                                                onCheckedChange={(checked) => handlePermissionToggle(permissionId, !!checked)}
                                            />
                                            <label
                                                htmlFor={`add-${permissionId}`}
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
                         {permissionsConfig.length === 0 && (
                            <p className="text-muted-foreground text-center col-span-3">No permissions configured.</p>
                        )}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddPersonnel}>Save Personnel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    