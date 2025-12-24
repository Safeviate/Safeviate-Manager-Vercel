'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { PilotProfile } from '../users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';


function isPilotProfile(userProfile: PilotProfile | undefined): userProfile is PilotProfile {
    if (!userProfile) return false;
    const pilotTypes: Array<PilotProfile['userType']> = ['Student', 'Private Pilot', 'Instructor'];
    return pilotTypes.includes(userProfile.userType);
}


export default function MyDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const userProfileQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `tenants/${tenantId}/pilots`),
            where('id', '==', user.uid)
        ) : null,
        [firestore, tenantId, user]
    );

    const { data: userProfileData, isLoading: isLoadingProfile } = useCollection<PilotProfile>(userProfileQuery);
    const userProfile = userProfileData?.[0];
    const isLoading = isUserLoading || isLoadingProfile;
    const pilotProfileExists = userProfile && isPilotProfile(userProfile);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (!pilotProfileExists) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Logbook is available for pilot profiles only.</p>
            </div>
        );
    }
    
    return (
        <MyLogbook userProfile={userProfile} />
    );
}
