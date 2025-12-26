
'use client';

import React from 'react';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { MyLogbook } from '@/app/(app)/my-dashboard/my-logbook';

interface UserLogbookProps {
    user: PilotProfile;
}

export function UserLogbook({ user }: UserLogbookProps) {
    return <MyLogbook userProfile={user} />;
}
