
'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DynamicLogbook } from './dynamic-logbook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TableTemplate } from '@/types/table-template';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const publishedTableRef = useMemoFirebase(
      () => firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, 'my-dashboard') : null,
      [firestore, tenantId]
    );
    const { data: publishedTable, isLoading: isLoadingTable } = useDoc<TableTemplate>(publishedTableRef);
    
    const isLoading = isLoadingProfile || isLoadingTable;

    if (isLoading) {
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
            {publishedTable ? (
                <DynamicLogbook template={publishedTable} userProfile={userProfile} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Logbook Not Configured</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-center py-10">
                            No logbook template has been published to this dashboard. Please configure one in the Table Builder.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
