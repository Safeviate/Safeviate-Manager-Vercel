
'use client';

import { Suspense } from 'react';
import { StudentDebriefForm } from './student-debrief-form';
import { usePermissions } from '@/hooks/use-permissions';

function NewDebriefPage() {
    const { hasPermission } = usePermissions();

    if (!hasPermission('training-debriefs-edit')) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                You do not have permission to create debrief reports.
            </div>
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
