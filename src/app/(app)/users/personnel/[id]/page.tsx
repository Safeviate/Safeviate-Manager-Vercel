'use client';

import { useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel } from '../page';
import type { Role } from '../../roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfilePageProps {
    params: { id: string };
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const userId = params.id;

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

    if (isLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
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
        <div>
            <EditPersonnelForm
                tenantId={tenantId}
                personnel={personnel}
                roles={roles || []}
                departments={departments || []}
            />
        </div>
    );
}
