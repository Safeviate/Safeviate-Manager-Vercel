
'use client';

import { Suspense } from 'react';
import { StudentDebriefForm } from './student-debrief-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function NewDebriefPage() {
    const { hasPermission } = usePermissions();

    if (!hasPermission('training-debriefs-edit')) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Permission Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        You do not have permission to create debrief reports.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div>
            <StudentDebriefForm />
        </div>
    )
}

export default function NewDebriefPageWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewDebriefPage />
        </Suspense>
    )
}
