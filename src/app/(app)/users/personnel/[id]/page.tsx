
'use client';

import { useState, useMemo, use } from 'react';
import { collection, doc, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { ViewPersonnelDetails } from './view-personnel-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface UserProfilePageProps {
    params: { id: string };
}

type UserProfile = Personnel | PilotProfile;

export default function UserProfilePage({ params }: UserProfilePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const userId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);

    // We fetch from both collections. Only one will return data.
    const personnelDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'personnel', userId) : null),
        [firestore, tenantId, userId]
    );
     const pilotDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'pilots', userId) : null),
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
    const { data: pilot, isLoading: isLoadingPilot, error: pilotError } = useDoc<PilotProfile>(pilotDocRef);

    const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
    const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);

    const user = personnel || pilot;
    const isLoading = isLoadingPersonnel || isLoadingPilot || isLoadingRoles || isLoadingDepts;
    const error = personnelError || pilotError || rolesError || deptsError;

    const currentRole = useMemo(() => {
        if (user && 'role' in user) {
            return roles?.find(r => r.id === user.role) || null;
        }
        return null;
    }, [roles, user]);

    const currentDepartment = useMemo(() => {
        if (user && 'department' in user) {
            return departments?.find(d => d.id === user.department) || null;
        }
        return null;
    }, [departments, user]);


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

    if (!user) {
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
                    user={user}
                    roles={roles || []}
                    departments={departments || []}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <ViewPersonnelDetails 
                    user={user} 
                    role={currentRole} 
                    department={currentDepartment}
                />
            )}
           
        </div>
    );
}

    