
'use client';

import { useState } from 'react';
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
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Personnel, PilotProfile } from './page';

type UserProfile = Personnel | PilotProfile;

interface PersonnelFormProps {
  tenantId: string;
  roles: Role[];
  departments: Department[];
}

const userTypes: UserProfile['userType'][] = ["Student", "Private Pilot", "Personnel", "Instructor"];

const isPilotUserType = (userType: UserProfile['userType'] | ''): userType is PilotProfile['userType'] => {
    return userType === 'Student' || userType === 'Private Pilot' || userType === 'Instructor';
}

export function PersonnelForm({ tenantId, roles, departments }: PersonnelFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [userType, setUserType] = useState<UserProfile['userType'] | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const handleAddUser = () => {
    if (!userType || !firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'User Type, First Name, Last Name, and Email are required.',
      });
      return;
    }

    if (!isPilotUserType(userType) && !selectedRole) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Role is required for Personnel.',
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

    let newUser: Omit<Personnel, 'id'> | Omit<PilotProfile, 'id'>;
    let collectionName: 'personnel' | 'pilots';

    if (isPilotUserType(userType)) {
        collectionName = 'pilots';
        newUser = {
            userType,
            firstName,
            lastName,
            email,
        };
    } else {
        collectionName = 'personnel';
        newUser = { 
            userType,
            firstName, 
            lastName, 
            email,
            department: selectedDepartment?.id || undefined,
            role: selectedRole!.id, 
            permissions: selectedRole!.permissions || [],
        };
    }

    const collectionRef = collection(firestore, 'tenants', tenantId, collectionName);
    addDocumentNonBlocking(collectionRef, newUser);

    toast({
      title: 'User Added',
      description: `User ${firstName} ${lastName} is being created.`,
    });

    resetForm();
  };

  const resetForm = () => {
    setUserType('');
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
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user with their basic information. More details can be added after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2 col-span-2">
                    <Label htmlFor="userType">User Type</Label>
                    <Select onValueChange={(value) => setUserType(value as UserProfile['userType'])} value={userType}>
                        <SelectTrigger id="userType">
                            <SelectValue placeholder="Select a user type" />
                        </SelectTrigger>
                        <SelectContent>
                            {userTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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
                {!isPilotUserType(userType) && userType !== '' && (
                    <>
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
                    </>
                )}
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddUser}>Save User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
