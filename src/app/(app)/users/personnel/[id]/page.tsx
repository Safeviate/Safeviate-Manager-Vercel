
'use client';

import { useState, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel } from '../page';
import type { Role } from '../../roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { ViewPersonnelDetails } from './view-personnel-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface UserProfilePageProps {
    params: { id: string };
}

export default function UserProfilePage({ params: { id: userId } }: UserProfilePageProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const [isEditing, setIsEditing] = useState(false);

    const personnelDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'personnel', userId) : null),
        [firestore, tenantId, userId]
    );

    const rolesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'roles') : null),
        [firestore, tenantId]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'departments') : null),
        [firestore, tenantId]
    );

    const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useDoc<Personnel>(personnelDocRef);
    const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
    const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);

    const isLoading = isLoadingPersonnel || isLoadingRoles || isLoadingDepts;
    const error = personnelError || rolesError || deptsError;

    const currentRole = useMemo(() => roles?.find(r => r.id === personnel?.role) || null, [roles, personnel]);
    const currentDepartment = useMemo(() => departments?.find(d => d.id === personnel?.department) || null, [departments, personnel]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>;
    }

    if (!personnel) {
        return <div>User not found.</div>;
    }

    return (
        <div className='space-y-6'>
            {!isEditing && (
                <div className="flex justify-end">
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2' />
                        Edit Profile
                    </Button>
                </div>
            )}
            
            {isEditing ? (
                 <EditPersonnelForm
                    tenantId={tenantId}
                    personnel={personnel}
                    roles={roles || []}
                    departments={departments || []}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <ViewPersonnelDetails 
                    personnel={personnel} 
                    role={currentRole} 
                    department={currentDepartment}
                />
            )}
           
        </div>
    );
}
