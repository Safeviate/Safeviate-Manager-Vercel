'use client';

import { useState, useMemo, use, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Personnel, PilotProfile } from '../page';
import type { Role } from '../../../admin/roles/page';
import type { Department } from '../../../admin/department/page';
import { EditPersonnelForm } from './edit-personnel-form';
import { ViewPersonnelDetails } from './view-personnel-details';
import { Skeleton } from '@/components/ui/skeleton';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface UserProfilePageProps {
    params: Promise<{ id: string }>;
}

type UserProfile = Personnel | PilotProfile;

function UserProfileContent({ params }: UserProfilePageProps) {
    const resolvedParams = use(params);
    const searchParams = useSearchParams();
    const userType = searchParams.get('type') || 'Personnel';
    const { hasPermission } = usePermissions();
    const isMobile = useIsMobile();
    const { tenantId } = useUserProfile();
    const userId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);
    const canEditUsers = hasPermission('users-edit');

    const [user, setUser] = useState<UserProfile | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [logbookTemplates, setLogbookTemplates] = useState<LogbookTemplate[]>([]);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoadingUser(true);
            try {
                const response = await fetch('/api/personnel', { cache: 'no-store' });
                const payload = await response.json().catch(() => ({}));

                const apiPersonnel = Array.isArray(payload?.personnel) ? payload.personnel : [];
                const apiRoles = Array.isArray(payload?.roles) ? payload.roles : [];
                const apiDepartments = Array.isArray(payload?.departments) ? payload.departments : [];

                if (!cancelled) {
                    const found = apiPersonnel.find((u: UserProfile) => u.id === userId);
                    if (found) setUser(found);
                    setRoles(apiRoles);
                    setDepartments(apiDepartments);
                }
            } catch {
                // ignore and fall back to local storage
            } finally {
                if (!cancelled) setIsLoadingUser(false);
            }
        };

        try {
            void load();
            const collectionName = userType === 'Instructor' ? 'instructors' :
                                   userType === 'Student' ? 'students' :
                                   userType === 'Private Pilot' ? 'private-pilots' : 'personnel';
            
            const storedUser = localStorage.getItem(`safeviate.${collectionName}`);
            if (storedUser) {
                const arr = JSON.parse(storedUser) as UserProfile[];
                const found = arr.find(u => u.id === userId);
                if (found) setUser(found);
            }

            const storedRoles = localStorage.getItem('safeviate.roles');
            if (storedRoles) setRoles(JSON.parse(storedRoles));

            const storedDepts = localStorage.getItem('safeviate.departments');
            if (storedDepts) setDepartments(JSON.parse(storedDepts));

            const storedLogbooks = localStorage.getItem('safeviate.logbook-templates');
            if (storedLogbooks) setLogbookTemplates(JSON.parse(storedLogbooks));
        } catch {
            // ignore
        }
        return () => {
            cancelled = true;
        };
    }, [userType, userId]);

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
                    tenantId={tenantId || ''}
                    user={user}
                    roles={roles || []}
                    departments={departments || []}
                    logbookTemplates={logbookTemplates || []}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <ViewPersonnelDetails 
                        user={user} 
                        role={currentRole} 
                        department={currentDepartment}
                        actions={
                            canEditUsers && (
                                <Button 
                                    onClick={() => setIsEditing(true)}
                                    size={isMobile ? "compact" : "default"}
                                >
                                    <Pencil className='mr-2 h-4 w-4' /> {isMobile ? "Edit" : "Edit Profile"}
                                </Button>
                            )
                        }
                    />
                </div>
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
