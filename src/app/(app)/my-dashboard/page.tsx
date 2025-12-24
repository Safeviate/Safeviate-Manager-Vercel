
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { PilotProfile } from '../users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { MyLogbook } from './my-logbook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LogbookTemplate } from '@/app/(app)/development/logbook-parser/page';

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // Fetch all available logbook templates
    const logbookTemplatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/logbook-templates`) : null),
        [firestore, tenantId]
    );

    const { data: templates, isLoading: isLoadingTemplates } = useCollection<LogbookTemplate>(logbookTemplatesQuery);

    // Create a dummy user profile and assign the ID of the FIRST available template
    const dummyUserProfile: PilotProfile | null = useMemo(() => {
        if (!templates || templates.length === 0) {
            return null;
        }
        return {
            id: 'dummy-user',
            userType: 'Instructor',
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@safeviate.com',
            role: 'demo-role',
            logbookTemplateId: templates[0].id, // Use the first template found
        };
    }, [templates]);
    
    const isLoading = isLoadingTemplates;
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (!dummyUserProfile) {
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
    
    return (
        <div className="w-full">
            <MyLogbook userProfile={dummyUserProfile} />
        </div>
    );
}
