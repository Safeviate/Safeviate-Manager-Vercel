
'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { GeminiLogbook } from './gemini-logbook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();

    if (isLoadingProfile) {
        return (
            <div className="w-full space-y-6">
                <Skeleton className="h-64 w-full" />
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
                    <p className="text-muted-foreground text-center py-10">
                        User profile not found. Unable to display dashboard content.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    if (userProfile.userType !== 'Student' && userProfile.userType !== 'Instructor' && userProfile.userType !== 'Private Pilot') {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>My Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-10">
                        This dashboard is only available for pilot user types.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full space-y-6">
            <GeminiLogbook userProfile={userProfile} />
        </div>
    );
}
