'use client';

import React from 'react';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { MyLogbook } from '@/app/(app)/my-dashboard/my-logbook';

interface UserLogbookProps {
    user: PilotProfile;
}

export function UserLogbook({ user }: UserLogbookProps) {
    return <MyLogbook userProfile={user} />;
}
