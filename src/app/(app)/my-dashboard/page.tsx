'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DynamicLogbook } from './dynamic-logbook';
import type { TableTemplate } from '@/types/table-template';

export default function MyDashboardPage() {
    const { userProfile, isLoading: isLoadingProfile } = useUserProfile();
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // Fetch the table template that has been published to the 'my-dashboard' page ID.
    const publishedTableRef = useMemoFirebase(
      () => (firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, 'my-dashboard') : null),
      [firestore, tenantId]
    );
    const { data: publishedTable, isLoading: isLoadingTable } = useDoc<{ tableData: TableTemplate }>(publishedTableRef);
    
    const isLoading = isLoadingProfile || isLoadingTable;

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Logbook</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!userProfile || (userProfile.userType !== 'Student' && userProfile.userType !== 'Private Pilot' && userProfile.userType !== 'Instructor')) {
        return (
           <Card>
               <CardHeader>
                   <CardTitle>My Logbook</CardTitle>
               </CardHeader>
               <CardContent>
                   <p className="text-muted-foreground text-center py-10">
                       This logbook is only available for pilot user types.
                   </p>
               </CardContent>
           </Card>
       );
   }

    return (
        <div className="w-full space-y-6">
             {publishedTable && publishedTable.tableData ? (
                <DynamicLogbook template={publishedTable.tableData} userProfile={userProfile} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>My Logbook</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-center py-10">
                            No logbook template has been published for this page.
                            <br />
                            Please publish a template from the Table Builder in the Development section.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
