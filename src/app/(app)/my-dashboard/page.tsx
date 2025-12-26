'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();
    
    if (isLoadingProfile) {
        return (
            <div className="w-full space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!userProfile) {
        return (
            <div className="w-full space-y-6">
                <p className="text-muted-foreground text-center py-10">
                    User profile not found. Unable to display dashboard content.
                </p>
            </div>
        );
    }
    
    // We can only show dashboard content for a student or instructor.
    if (userProfile.userType !== 'Student' && userProfile.userType !== 'Instructor' && userProfile.userType !== 'Private Pilot') {
         return (
            <div className="w-full space-y-6">
                 <p className="text-muted-foreground text-center py-10">
                    This dashboard is only available for pilot user types.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <MyLogbook userProfile={userProfile} />
        </div>
    );
}
