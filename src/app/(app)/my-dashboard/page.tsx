'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TableTemplate } from '@/app/(app)/development/table-builder/page';
import { DynamicLogbook } from './dynamic-logbook';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const pageId = 'my-dashboard';

    const publishedTableRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, pageId) : null),
        [firestore, tenantId, pageId]
    );

    const { data: publishedTable, isLoading: isLoadingTable } = useDoc<{tableData: TableTemplate['tableData']}>(publishedTableRef);
    
    const isLoading = isLoadingProfile || isLoadingTable;

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
            {publishedTable?.tableData ? (
                <Card>
                    <CardHeader>
                        <CardTitle>My Logbook</CardTitle>
                        <CardDescription>
                            A dynamic view of your flights based on the published template.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <DynamicLogbook tableData={publishedTable.tableData} userProfile={userProfile} />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Logbook Not Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-center py-10">
                            No logbook template has been published to this page. Please publish a template from the Table Builder in the Development section.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
