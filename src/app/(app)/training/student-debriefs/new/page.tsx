'use client';

import { Suspense } from 'react';
import { StudentDebriefForm } from './student-debrief-form';

function NewDebriefPage() {
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
