
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';
import { GeminiLogbook } from './gemini-logbook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // Fetch the first available logbook template
    const logbookTemplatesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/logbook-templates`), limit(1)) : null),
        [firestore, tenantId]
    );

    const { data: templates, isLoading: isLoadingTemplates } = useCollection<LogbookTemplate>(logbookTemplatesQuery);

    const logbookTemplate = useMemo(() => {
        if (!templates || templates.length === 0) {
            return null;
        }
        return templates[0];
    }, [templates]);
    
    const isLoading = isLoadingTemplates;
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (!logbookTemplate) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>My Logbook</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                        No logbook templates have been created yet. Please go to "Development" -&gt; "Logbook Parser" to create one.
                    </p>
                </CardContent>
            </Card>
        )
    }
    
    // Create a dummy user profile to pass to the original logbook component
    const dummyUserProfile = {
        id: 'dummy-user-for-live-data',
        userType: 'Instructor' as const,
        firstName: 'Live',
        lastName: 'Data',
        email: 'live@safeviate.com',
        role: 'demo-role',
        logbookTemplateId: logbookTemplate.id,
    };
    
    return (
        <div className="w-full space-y-8">
            <MyLogbook userProfile={dummyUserProfile} />
            <GeminiLogbook template={logbookTemplate} />
        </div>
    );
}
