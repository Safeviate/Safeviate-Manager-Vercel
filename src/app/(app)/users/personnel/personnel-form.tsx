'use client';

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, ChevronsUpDown } from 'lucide-react';
import type { Role } from '@/app/(app)/admin/roles/page';
import type { Department } from '@/app/(app)/admin/department/page';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import type { Personnel, PilotProfile } from './personnel-directory-page';

interface PersonnelFormProps {
  tenantId: string;
  existingPersonnel?: Personnel | PilotProfile;
  roles: Role[];
  departments: Department[];
  externalOrganizations?: any[];
  defaultDepartmentId?: string | null;
  defaultRoleId?: string | null;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function PersonnelForm({
  tenantId,
  existingPersonnel,
  roles,
  departments,
  externalOrganizations,
  defaultDepartmentId = null,
  defaultRoleId = null,
  trigger,
  onClose,
}: PersonnelFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [userType, setUserType] = useState<string>('');
  const [userNumber, setUserNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isIncerfaContact, setIsIncerfaContact] = useState(false);
  const [isAlerfaContact, setIsAlerfaContact] = useState(false);

  useEffect(() => {
    if (existingPersonnel) {
      setUserType(existingPersonnel.userType || '');
      setUserNumber(existingPersonnel.userNumber || '');
      setFirstName(existingPersonnel.firstName);
      setLastName(existingPersonnel.lastName);
      setEmail(existingPersonnel.email);
      setSelectedDepartment(('department' in existingPersonnel ? (existingPersonnel as Personnel).department : null) || null);
      setSelectedRole(existingPersonnel.role);
      setOrganizationId(existingPersonnel.organizationId || null);
      setIsIncerfaContact(existingPersonnel.isErpIncerfaContact || false);
      setIsAlerfaContact(existingPersonnel.isErpAlerfaContact || false);
    } else if (defaultDepartmentId) {
      setSelectedDepartment(defaultDepartmentId);
    }
    if (!existingPersonnel && defaultRoleId) {
      setSelectedRole(defaultRoleId);
      const defaultRole = roles.find(r => r.id === defaultRoleId);
      setUserType(defaultRole?.category || 'Personnel');
    }
  }, [existingPersonnel, defaultDepartmentId, defaultRoleId, roles]);

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setSelectedRole(roleId);
      setUserType(role.category || '');
    }
  };

  const handleAddOrUpdateUser = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'All required fields must be filled.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingPersonnel) {
        const response = await fetch(`/api/personnel/${existingPersonnel.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personnel: {
              ...existingPersonnel,
              userNumber: userNumber || null,
              firstName,
              lastName,
              email,
              department: selectedDepartment || null,
              role: selectedRole,
              organizationId: organizationId === 'internal' ? null : organizationId,
              isErpIncerfaContact: !!isIncerfaContact,
              isErpAlerfaContact: !!isAlerfaContact,
            },
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update user.');
        toast({ title: 'User Updated' });
      } else {
        const response = await fetch('/api/admin/create-personnel', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId,
            firstName,
            lastName,
            email,
            userNumber: userNumber || null,
            department: selectedDepartment || null,
            role: selectedRole,
            userType,
            organizationId: organizationId === 'internal' ? null : (organizationId || null),
            isErpIncerfaContact: !!isIncerfaContact,
            isErpAlerfaContact: !!isAlerfaContact,
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Server error during user creation.');
        }

        toast({ title: 'User Created', description: 'The new account and profile have been established.' });
      }
      
      window.dispatchEvent(new Event('safeviate-personnel-updated'));
      setIsOpen(false);
      onClose?.();
    } catch (error: any) {
      console.error('Error adding/updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="firstName" className="text-right">First Name</Label>
        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="lastName" className="text-right">Last Name</Label>
        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="userNumber" className="text-right">User #</Label>
        <Input id="userNumber" value={userNumber} onChange={(e) => setUserNumber(e.target.value)} className="col-span-3" placeholder="e.g. BARRY-01" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">Role</Label>
        <Select value={selectedRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right">Dept</Label>
        <Select value={selectedDepartment || ''} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">ERP</Label>
        <div className="col-span-3 flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <Switch id="incerfa" checked={isIncerfaContact} onCheckedChange={setIsIncerfaContact} />
            <Label htmlFor="incerfa" className="text-xs font-normal cursor-pointer">INCERFA</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="alerfa" checked={isAlerfaContact} onCheckedChange={setIsAlerfaContact} />
            <Label htmlFor="alerfa" className="text-xs font-normal cursor-pointer">ALERFA</Label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={handleAddOrUpdateUser} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingPersonnel ? 'Save Changes' : 'Create Account'}
        </Button>
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{existingPersonnel ? 'Edit User Profile' : 'Create Organization Member'}</DialogTitle>
            <DialogDescription>
              {existingPersonnel ? 'Update system permissions and metadata.' : 'Establish a new secure login and directory profile.'}
            </DialogDescription>
          </DialogHeader>
          {formFields}
        </DialogContent>
      </Dialog>
    );
  }

  return formFields;
}
