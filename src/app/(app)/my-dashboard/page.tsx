
'use client';

import { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TableData } from '@/app/(app)/development/table-builder/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableViewer } from './table-viewer';
import { Skeleton } from '@/components/ui/skeleton';

// The entity type for a published table.
type PublishedTable = {
    pageId: string;
    tableData: TableData;
}

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    // This ID corresponds to the page we want to display the table on.
    const pageId = 'my-dashboard';

    // A memoized reference to the specific published table document for this page.
    const publishedTableRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, pageId) : null),
        [firestore, tenantId, pageId]
    );

    // useDoc hook to fetch the document in real-time.
    const { data: publishedTable, isLoading } = useDoc<PublishedTable>(publishedTableRef);

    return (
        <div className="w-full space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>Published Table Viewer</CardTitle>
                    <CardDescription>
                        This page displays the table that has been published to the &quot;{pageId}&quot; destination.
                    </CardDescription>
                </CardHeader>
                <CardContent className="mt-4 rounded-lg border p-4 min-h-[20rem] flex items-center justify-center">
                    {isLoading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : publishedTable ? (
                        <TableViewer tableData={publishedTable.tableData} />
                    ) : (
                        <p className="text-muted-foreground">No table has been published to this page yet.</p>
                    )}
                </CardContent>
           </Card>
        </div>
    );
}
