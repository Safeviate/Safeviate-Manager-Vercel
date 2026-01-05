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
        await initiateEmailSignUp(auth, email, password);
        // We can't get the UID directly here due to the non-blocking nature,
        // so we'll handle the Firestore document creation via a backend function or a more complex flow later.
        // For now, this creates the Auth user which is the main goal.
        
        // The user profile document creation should ideally be done in a secure backend environment
        // listening to Auth user creation events. For this dev environment, we'll proceed on the client.
        // This part assumes a short delay for auth propagation. In a real app, use Cloud Functions.

        // Placeholder: Manually create the firestore documents after a short delay
        setTimeout(async () => {
            try {
                // This is a simplified client-side creation. A real app would use a Cloud Function.
                const collectionName = determineCollection(userType);
                const userProfileCollection = collection(firestore, 'tenants', tenantId, collectionName);
                
                // We don't have the UID here, so we will have to link it later.
                // This is a limitation of client-side-only logic.
                // In this simplified example, we'll use a temporary ID and expect manual linking or a backend process.
                const newUserProfileRef = doc(userProfileCollection);

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

                const usersCollection = collection(firestore, 'users');
                const userLinkRef = doc(usersCollection, newUserProfileRef.id);
                const userLinkData = {
                    email: email,
                    profilePath: newUserProfileRef.path
                };

                const batch = writeBatch(firestore);
                batch.set(newUserProfileRef, newUserProfileData);
                // This user link is crucial for the login flow
                // We create it with a queryable email field.
                batch.set(doc(collection(firestore, 'users'), email), userLinkData);

                await batch.commit();

                 toast({
                    title: 'User Profile Created',
                    description: `Firestore profile for ${firstName} ${lastName} created.`,
                });

            } catch (fsError) {
                console.error("Firestore user creation failed:", fsError);
                toast({
                    variant: 'destructive',
                    title: 'Firestore Error',
                    description: 'Auth user was created, but Firestore profile creation failed.',
                });
            }
        }, 2000); // 2-second delay to allow auth to process

        toast({
          title: 'User Creation Initiated',
          description: `Auth user for ${email} is being created.`,
        });

        resetForm();

    } catch (error) {
        console.error("Error creating user:", error);
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: 'An unexpected error occurred while creating the user.',
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
