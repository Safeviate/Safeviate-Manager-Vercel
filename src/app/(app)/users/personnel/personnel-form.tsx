
'use client';

import { useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
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
import { useFirestore, useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Personnel, PilotProfile } from './page';

type UserProfile = Personnel | PilotProfile;
type UserType = UserProfile['userType'];

const userTypes: UserType[] = ["Personnel", "Instructor", "Student", "Private Pilot"];

const determineCollectionName = (userType: UserType | ''): string => {
    switch(userType) {
        case 'Personnel': return 'personnel';
        case 'Instructor': return 'instructors';
        case 'Student': return 'students';
        case 'Private Pilot': return 'private-pilots';
        default: return 'personnel'; // Fallback
    }
}

interface PersonnelFormProps {
  tenantId: string;
  roles: Role[];
  departments: Department[];
  trigger?: React.ReactNode;
}

export function PersonnelForm({ tenantId, roles, departments, trigger }: PersonnelFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [userType, setUserType] = useState<UserType | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const handleAddUser = async () => {
    if (!userType || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'User Type, Name, Email, Password, and Role are all required.',
      });
      return;
    }

    if (!firestore || !auth) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database or auth service.',
      });
      return;
    }

    try {
        // 1. Create the Firebase Auth user first. This is the only part that isn't in the batch.
        // If this fails, the process stops before any Firestore documents are created.
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const authUser = userCredential.user;

        // 2. Prepare the batch write for atomicity
        const batch = writeBatch(firestore);

        // 3. Define the path for the user's detailed profile
        const collectionName = determineCollectionName(userType);
        const profileRef = doc(firestore, 'tenants', tenantId, collectionName, authUser.uid);
        
        let profileData: Partial<UserProfile> = {
            id: authUser.uid,
            userType,
            firstName,
            lastName,
            email,
            role: selectedRole.id,
        };

        if (userType === 'Personnel') {
            (profileData as Personnel).department = selectedDepartment?.id;
            (profileData as Personnel).permissions = selectedRole.permissions || [];
        }
        
        // 4. Define the path for the crucial linking document in the top-level 'users' collection
        const userLinkRef = doc(firestore, 'users', authUser.uid);
        const userLinkData = {
            id: authUser.uid,
            email: email,
            profilePath: profileRef.path // Store the full path to the detailed profile
        };

        // 5. Add both document creations to the batch
        batch.set(profileRef, profileData);
        batch.set(userLinkRef, userLinkData);

        // 6. Commit the batch. This is an atomic operation.
        await batch.commit();

        toast({
          title: 'User Created Successfully',
          description: `Auth user and profile for ${email} have been created.`,
        });

        resetForm();

    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: error.message || 'An unexpected error occurred while creating the user.',
        });
    }
  };

  const resetForm = () => {
    setUserType('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
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
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user profile and authentication account.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2 col-span-2">
                    <Label htmlFor="userType">User Type</Label>
                    <Select onValueChange={(value) => setUserType(value as UserType)} value={userType}>
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
                 <div className="space-y-2 col-span-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

                {userType === 'Personnel' && (
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
