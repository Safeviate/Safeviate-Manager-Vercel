'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TableTemplate } from '@/types/table-template';
import { DynamicLogbook } from './dynamic-logbook';
import { GeminiLogbook } from './gemini-logbook';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    
    const publishedTableRef = useMemoFirebase(
      () => (firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, 'my-dashboard') : null),
      [firestore, tenantId]
    );

    const { data: publishedTable, isLoading: isLoadingTable } = useDoc<{tableData: TableTemplate['tableData']}>(publishedTableRef);
    
    const isLoading = isLoadingProfile || isLoadingTable;

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full mt-6" />
            </div>
        )
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
            {publishedTable?.tableData ? (
                <DynamicLogbook template={{tableData: publishedTable.tableData, name: "Logbook", id: "logbook"}} userProfile={userProfile} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>My Logbook</CardTitle>
                        <CardDescription>A record of your completed flights.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No logbook template has been published for this page.<br />Please create and publish a template from the Table Builder in the Development section.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <GeminiLogbook userProfile={userProfile} />
        </div>
    );
}
