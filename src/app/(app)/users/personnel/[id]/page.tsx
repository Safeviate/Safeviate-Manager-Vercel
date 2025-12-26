
'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { ViewPersonnelDetails } from './view-personnel-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';

interface UserProfilePageProps {
    params: { id: string };
}

type UserProfile = Personnel | PilotProfile;

const isPilotProfile = (user: UserProfile): user is PilotProfile => {
    return user.userType === 'Student' || user.userType === 'Private Pilot' || user.userType === 'Instructor';
}

function UserProfileContent({ params }: UserProfilePageProps) {
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const userType = searchParams.get('type') || 'Personnel';

    const tenantId = 'safeviate'; // Hardcoded for now
    const userId = params.id;
    const [isEditing, setIsEditing] = useState(false);

    const collectionName = useMemo(() => {
        switch(userType) {
            case 'Personnel': return 'personnel';
            case 'Instructor': return 'instructors';
            case 'Student': return 'students';
            case 'Private Pilot': return 'private-pilots';
            default: return 'personnel';
        }
    }, [userType]);

    const userDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, collectionName, userId) : null),
        [firestore, tenantId, collectionName, userId]
    );

    const rolesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'roles') : null),
        [firestore, tenantId]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'departments') : null),
        [firestore, tenantId]
    );
    
    const logbookTemplatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'logbook-templates') : null),
        [firestore, tenantId]
    );

    const { data: user, isLoading: isLoadingUser, error: userError } = useDoc<UserProfile>(userDocRef);
    const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
    const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);
    const { data: logbookTemplates, isLoading: isLoadingTemplates } = useCollection<LogbookTemplate>(logbookTemplatesQuery);

    const isLoading = isLoadingUser || isLoadingRoles || isLoadingDepts || isLoadingTemplates;
    const error = userError || rolesError || deptsError;

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
            {isEditing ? (
                 <EditPersonnelForm
                    tenantId={tenantId}
                    user={user}
                    roles={roles || []}
                    departments={departments || []}
                    logbookTemplates={logbookTemplates || []}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsEditing(true)}>
                            <Pencil className='mr-2' />
                            Edit Profile
                        </Button>
                    </div>
                    <ViewPersonnelDetails 
                        user={user} 
                        role={currentRole} 
                        department={currentDepartment}
                    />
                </>
            )}
           
        </div>
    );
}


export default function UserProfilePageWrapper(props: UserProfilePageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfileContent {...props} />
    </Suspense>
  )
}
