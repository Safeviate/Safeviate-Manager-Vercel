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

  // Simplified form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
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
        department: selectedDepartment?.id || null,
        role: selectedRole.id, 
        permissions: selectedRole.permissions || [], // Default to role's permissions
        // Other fields are intentionally omitted for simplicity
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
    setSelectedDepartment(null);
    setSelectedRole(null);
    setIsOpen(false);
  }

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Personnel</DialogTitle>
          <DialogDescription>
            Create a new user with their basic information. More details can be added after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
