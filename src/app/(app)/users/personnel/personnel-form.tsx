
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
import { useFirestore, useAuth, initiateEmailSignUp } from '@/firebase';
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

const userTypes: UserProfile['userType'][] = ["Personnel", "Instructor", "Student", "Private Pilot"];

const determineCollection = (userType: UserProfile['userType'] | ''): string => {
    switch(userType) {
        case 'Personnel': return 'personnel';
        case 'Instructor': return 'instructors';
        case 'Student': return 'students';
        case 'Private Pilot': return 'private-pilots';
        default: return 'personnel'; // Fallback
    }
}

export function PersonnelForm({ tenantId, roles, departments }: PersonnelFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [userType, setUserType] = useState<UserProfile['userType'] | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const handleAddUser = async () => {
    if (!userType || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'User Type, Name, Email, and Password are required.',
      });
      return;
    }

    if (!selectedRole) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Role is required for all users.',
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
        // Step 1: Create the Firebase Auth user
        const userCredential = await initiateEmailSignUp(auth, email, password);
        
        if (!userCredential || !userCredential.user) {
            throw new Error("User creation failed, no user returned from auth.");
        }

        const authUser = userCredential.user;

        // Step 2: Create the user profile document in the appropriate collection
        const collectionName = determineCollection(userType);
        const newUserProfileRef = doc(firestore, 'tenants', tenantId, collectionName, authUser.uid);

        let newUserProfileData: Omit<UserProfile, 'id'> = {
            userType,
            firstName,
            lastName,
            email,
            role: selectedRole.id,
        } as any;

        if (userType === 'Personnel') {
            (newUserProfileData as Personnel).department = selectedDepartment?.id;
            (newUserProfileData as Personnel).permissions = selectedRole.permissions || [];
        }

        // Step 3: Create the user link document in the top-level 'users' collection
        const userLinkRef = doc(firestore, 'users', authUser.uid);
        const userLinkData = {
            id: authUser.uid,
            email: email,
            profilePath: newUserProfileRef.path
        };

        // Step 4: Commit all changes in a batch
        const batch = writeBatch(firestore);
        batch.set(newUserProfileRef, newUserProfileData);
        batch.set(userLinkRef, userLinkData);

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
            Create a new user profile and authentication account.
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
