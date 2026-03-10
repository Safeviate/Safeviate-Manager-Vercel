
'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { ViewPersonnelDetails } from './view-personnel-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';
import { usePermissions } from '@/hooks/use-permissions';

interface UserProfilePageProps {
    params: Promise<{ id: string }>;
}

type UserProfile = Personnel | PilotProfile;

function UserProfileContent({ params }: UserProfilePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const userType = searchParams.get('type') || 'Personnel';
    const { hasPermission } = usePermissions();

    const tenantId = 'safeviate';
    const userId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);
    const canEditUsers = hasPermission('users-edit');

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

    const { data: user, isLoading: isLoadingUser } = useDoc<UserProfile>(userDocRef);
    const { data: roles } = useCollection<Role>(rolesQuery);
    const { data: departments } = useCollection<Department>(departmentsQuery);
    const { data: logbookTemplates } = useCollection<LogbookTemplate>(logbookTemplatesQuery);

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

    if (isLoadingUser) {
        return <div className="p-8 h-full"><Skeleton className="h-full w-full" /></div>;
    }

    if (!user) {
        return <div className="p-8 text-center">User not found.</div>;
    }

    return (
        <div className='flex flex-col h-full overflow-hidden gap-4'>
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
                    <div className="flex justify-end shrink-0">
                        {canEditUsers && (
                            <Button onClick={() => setIsEditing(true)}>
                                <Pencil className='mr-2 h-4 w-4' /> Edit Profile
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ViewPersonnelDetails 
                            user={user} 
                            role={currentRole} 
                            department={currentDepartment}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default function UserProfilePageWrapper(props: UserProfilePageProps) {
  return (
    <Suspense fallback={<div className="p-8 h-full"><Skeleton className="h-full w-full" /></div>}>
      <UserProfileContent {...props} />
    </Suspense>
  )
}
