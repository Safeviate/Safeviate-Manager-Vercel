'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { permissionsConfig } from '@/lib/permissions-config';
import type { Personnel } from '../page';
import type { Role } from '../../roles/page';
import type { Department } from '../../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface EditPersonnelFormProps {
  tenantId: string;
  personnel: Personnel;
  roles: Role[];
  departments: Department[];
}

export function EditPersonnelForm({ tenantId, personnel, roles, departments }: EditPersonnelFormProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(personnel.firstName);
  const [lastName, setLastName] = useState(personnel.lastName);
  const [email, setEmail] = useState(personnel.email);
  const [contactNumber, setContactNumber] = useState(personnel.contactNumber || '');
  const [address, setAddress] = useState(personnel.address || {});
  const [emergencyContact, setEmergencyContact] = useState(personnel.emergencyContact || {});
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(personnel.permissions || []);
  
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
    setFirstName(personnel.firstName);
    setLastName(personnel.lastName);
    setEmail(personnel.email);
    setContactNumber(personnel.contactNumber || '');
    setAddress(personnel.address || {});
    setEmergencyContact(personnel.emergencyContact || {});
    setSelectedPermissions(personnel.permissions || []);
    const currentRole = roles.find(r => r.id === personnel.role) || null;
    setSelectedRole(currentRole);
    const currentDept = departments.find(d => d.id === personnel.department) || null;
    setSelectedDepartment(currentDept);
  }, [personnel, roles, departments]);

  useEffect(() => {
    // This effect runs when a role is selected, but we only want to
    // automatically set permissions if they haven't been manually customized.
    // A simple check is to see if the user's current permissions match the old role's permissions.
    if (selectedRole) {
        const oldRole = roles.find(r => r.id === personnel.role);
        if (oldRole && JSON.stringify(personnel.permissions) === JSON.stringify(oldRole.permissions)) {
             setSelectedPermissions(selectedRole.permissions || []);
        }
    }
  }, [selectedRole, personnel.role, personnel.permissions, roles]);


  const handleUpdatePersonnel = () => {
     if (!firstName.trim() || !lastName.trim() || !email.trim() || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required fields.',
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

    const personnelRef = doc(firestore, 'tenants', tenantId, 'personnel', personnel.id);
    updateDocumentNonBlocking(personnelRef, { 
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
        title: 'Personnel Updated',
        description: `User ${firstName} ${lastName} is being updated.`,
    });
    
    router.push('/users/personnel');
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
  
  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setSelectedRole(role || null);
  }

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    setSelectedDepartment(dept || null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Personnel</CardTitle>
        <CardDescription>
            Update details for {personnel.firstName} {personnel.lastName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[calc(100vh-22rem)] pr-6">
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
                        <Input id="street" value={address?.street || ''} onChange={(e) => setAddress({...address, street: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={address?.city || ''} onChange={(e) => setAddress({...address, city: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Input id="state" value={address?.state || ''} onChange={(e) => setAddress({...address, state: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input id="postalCode" value={address?.postalCode || ''} onChange={(e) => setAddress({...address, postalCode: e.target.value})} />
                    </div>
                    <div className="space-y-2 col-span-3">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" value={address?.country || ''} onChange={(e) => setAddress({...address, country: e.target.value})} />
                    </div>
                </div>

                <Separator />
                <h4 className="text-md font-medium">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="emergencyName">Full Name</Label>
                        <Input id="emergencyName" value={emergencyContact?.name || ''} onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergencyRelationship">Relationship</Label>
                        <Input id="emergencyRelationship" value={emergencyContact?.relationship || ''} onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergencyPhone">Phone Number</Label>
                        <Input id="emergencyPhone" value={emergencyContact?.phone || ''} onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
                    </div>
                </div>

                <Separator />
                <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
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
                        <Button variant="link" onClick={handleSelectAllToggle} className="p-0 h-auto">
                            {areAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>
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
      </CardContent>
      <CardFooter className="border-t pt-6">
          <Button onClick={handleUpdatePersonnel}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
