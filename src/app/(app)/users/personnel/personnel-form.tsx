'use client';

import { useState } from 'react';
import { collection, doc, writeBatch, query } from 'firebase/firestore';
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
import { useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Personnel, PilotProfile } from './page';
import type { ExternalOrganization } from '@/types/quality';
import { Switch } from '@/components/ui/switch';

type UserProfile = Personnel | PilotProfile;
type UserType = UserProfile['userType'];

const determineCollectionName = (userType: UserType | ''): string => {
    switch(userType) {
        case 'Personnel': return 'personnel';
        case 'Instructor': return 'instructors';
        case 'Student': return 'students';
        case 'Private Pilot': return 'private-pilots';
        case 'External': return 'personnel';
        default: return 'personnel';
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

  const orgsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  const { data: organizations } = useCollection<ExternalOrganization>(orgsQuery);

  // Form state
  const [userType, setUserType] = useState<UserType | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isIncerfaContact, setIsIncerfaContact] = useState(false);
  const [isAlerfaContact, setIsAlerfaContact] = useState(false);
  
  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
        setSelectedRole(role);
        // Automatically set userType based on role category
        setUserType(role.category as UserType);
    }
  };

  const handleAddUser = async () => {
    if (!userType || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Name, Email, Password, and Role are all required.',
      });
      return;
    }

    if (!firestore || !auth) return;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const authUser = userCredential.user;

        const batch = writeBatch(firestore);

        const collectionName = determineCollectionName(userType);
        const profileRef = doc(firestore, 'tenants', tenantId, collectionName, authUser.uid);
        
        let profileData: Partial<UserProfile> = {
            id: authUser.uid,
            userType,
            firstName,
            lastName,
            email,
            role: selectedRole.id,
            organizationId: selectedOrganization === 'internal' ? null : selectedOrganization,
            permissions: selectedRole.permissions || [], 
            isErpIncerfaContact: isIncerfaContact,
            isErpAlerfaContact: isAlerfaContact,
        };

        if (userType === 'Personnel' || userType === 'External') {
            (profileData as Personnel).department = selectedDepartment || undefined;
        }
        
        const userLinkRef = doc(firestore, 'users', authUser.uid);
        const userLinkData = {
            id: authUser.uid,
            email: email,
            profilePath: profileRef.path
        };

        batch.set(profileRef, profileData);
        batch.set(userLinkRef, userLinkData);

        await batch.commit();

        toast({ title: 'User Created Successfully' });
        resetForm();

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
    }
  };

  const resetForm = () => {
    setUserType('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setSelectedDepartment(null);
    setSelectedOrganization(null);
    setSelectedRole(null);
    setIsIncerfaContact(false);
    setIsAlerfaContact(false);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user profile and authentication account.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                <div className="space-y-2 col-span-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2 col-span-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select onValueChange={handleRoleChange} value={selectedRole?.id}>
                        <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                        <SelectContent>{roles.map(role => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Select onValueChange={setSelectedOrganization} value={selectedOrganization || ''}>
                        <SelectTrigger id="organization"><SelectValue placeholder="Select Organization" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="internal">Safeviate (Internal)</SelectItem>
                            {(organizations || []).map(org => (<SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/10">
                    <Switch 
                      id="erp-incerfa-new" 
                      checked={isIncerfaContact} 
                      onCheckedChange={setIsIncerfaContact} 
                    />
                    <Label htmlFor="erp-incerfa-new" className="cursor-pointer text-xs">INCERFA Contact</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/10">
                    <Switch 
                      id="erp-alerfa-new" 
                      checked={isAlerfaContact} 
                      onCheckedChange={setIsAlerfaContact} 
                    />
                    <Label htmlFor="erp-alerfa-new" className="cursor-pointer text-xs">ALERFA Contact</Label>
                  </div>
                </div>

                {(userType === 'Personnel' || userType === 'External') && (
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="department">Department</Label>
                        <Select onValueChange={setSelectedDepartment} value={selectedDepartment || ''}>
                            <SelectTrigger id="department"><SelectValue placeholder="Select a department" /></SelectTrigger>
                            <SelectContent>{departments.map(dept => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleAddUser}>Save User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
