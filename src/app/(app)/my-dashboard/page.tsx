
'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';

export default function MyDashboardPage() {
    const { userProfile, isLoading } = useUserProfile();

    if (isLoading) {
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
                    User profile not found. Unable to display logbook.
                </p>
            </div>
        );
    }
    
    // We can only show a logbook for a student or instructor.
    if (userProfile.userType !== 'Student' && userProfile.userType !== 'Instructor') {
         return (
            <div className="w-full space-y-6">
                 <p className="text-muted-foreground text-center py-10">
                    Logbook is only available for Students and Instructors.
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
