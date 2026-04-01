'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, setDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Personnel, UserType } from '@/app/(app)/users/personnel/page';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/app/(app)/admin/roles/page';
import type { Department } from '@/app/(app)/admin/department/page';

interface PersonnelFormProps {
  tenantId: string;
  existingPersonnel?: Personnel; // Optional prop for editing
  roles: Role[];
  departments: Department[];
  onClose: () => void; // Callback to close the dialog
}

export function PersonnelForm({
  tenantId,
  existingPersonnel,
  roles,
  departments,
  onClose,
}: PersonnelFormProps) {
  const firestore = useFirestore();
  const auth = getAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [userType, setUserType] = useState<UserType | ''>('');
  const [userNumber, setUserNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isIncerfaContact, setIsIncerfaContact] = useState(false);
  const [isAlerfaContact, setIsAlerfaContact] = useState(false);

  useEffect(() => {
    if (existingPersonnel) {
      setUserType(existingPersonnel.userType || '');
      setUserNumber(existingPersonnel.userNumber || '');
      setFirstName(existingPersonnel.firstName);
      setLastName(existingPersonnel.lastName);
      setEmail(existingPersonnel.email);
      setSelectedDepartment(existingPersonnel.department || null);
      setSelectedRole(roles?.find((r: any) => r.id === existingPersonnel.role) || null);
      setIsIncerfaContact(existingPersonnel.isErpIncerfaContact || false);
      setIsAlerfaContact(existingPersonnel.isErpAlerfaContact || false);
    } else {
      // Reset form for new user
      setUserType('');
      setUserNumber('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setSelectedDepartment(null);
      setSelectedRole(null);
      setIsIncerfaContact(false);
      setIsAlerfaContact(false);
    }
  }, [existingPersonnel, roles]);

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setSelectedRole(role);
      setUserType(role.category as UserType);
    }
  };

  const handleAddOrUpdateUser = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !selectedRole || (!existingPersonnel && !password.trim())) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'All required fields must be filled.',
      });
      return;
    }

    if (!firestore) return;
    setIsSubmitting(true);

    try {
      if (existingPersonnel) {
        const userRef = doc(firestore, `tenants/${tenantId}/personnel`, existingPersonnel.id);
        await updateDoc(userRef, {
          userType,
          userNumber: userNumber || null,
          firstName,
          lastName,
          email,
          department: selectedDepartment,
          role: selectedRole.id,
          isErpIncerfaContact: isIncerfaContact,
          isErpAlerfaContact: isAlerfaContact,
          updatedAt: new Date(),
        });
        toast({ title: 'User Updated' });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Create in Firestore using setDoc for new user
        const personnelRef = doc(firestore, `tenants/${tenantId}/personnel`, uid);
        await setDoc(personnelRef, {
            id: uid,
            userType,
            userNumber: userNumber || null,
            firstName,
            lastName,
            email,
            department: selectedDepartment,
            role: selectedRole.id,
            isErpIncerfaContact: isIncerfaContact,
            isErpAlerfaContact: isAlerfaContact,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create user link using setDoc for new user, using the NEW user's UID
        await setDoc(doc(firestore, 'users', uid), {
            email: email,
            profilePath: `tenants/${tenantId}/personnel/${uid}`
        });

        toast({ title: 'User Created' });
      }
      onClose(); // Call onClose to close the dialog
    } catch (error) {
      console.error('Error adding/updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
      {!existingPersonnel && (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />
        </div>
      )}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="userNumber" className="text-right">User #</Label>
        <Input id="userNumber" value={userNumber} onChange={(e) => setUserNumber(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right">Department</Label>
        <Select value={selectedDepartment || ''} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            {departments?.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">Role</Label>
        <Select value={selectedRole?.id || ''} onValueChange={handleRoleChange}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            {roles?.map((role: any) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">ERP Contact</Label>
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
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAddOrUpdateUser} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingPersonnel ? 'Save Changes' : 'Add Personnel'}
        </Button>
      </div>
    </div>
  );
}
