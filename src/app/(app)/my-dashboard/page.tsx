'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { PilotProfile } from '../users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


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
        () => (user && firestore) ? query(
            collection(firestore, `tenants/${tenantId}/pilots`),
            where('email', '==', user.email)
        ) : null,
        [firestore, tenantId, user]
    );

    const { data: userProfileData, isLoading: isLoadingProfile } = useCollection<PilotProfile>(userProfileQuery);
    const userProfile = userProfileData?.[0];
    
    const isLoading = isUserLoading || isLoadingProfile;
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (!userProfile) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>My Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                        No pilot profile found for the current user. Please contact an administrator.
                    </p>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <div className="w-full">
            <MyLogbook userProfile={userProfile} />
        </div>
    );
}
