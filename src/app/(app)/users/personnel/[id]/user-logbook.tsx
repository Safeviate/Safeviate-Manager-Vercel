
'use client';

import React from 'react';
import type { PilotProfile } from '../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface UserLogbookProps {
    user: PilotProfile;
}

export function UserLogbook({ user }: UserLogbookProps) {
    // This is placeholder data until we fetch real bookings
    const placeholderLogbookEntries = [
        { id: '1', date: '2024-07-15', aircraft: 'G-ABCD', totalTime: '1:30', type: 'Dual', studentSigned: true, instructorSigned: false },
        { id: '2', date: '2024-07-12', aircraft: 'G-EFGH', totalTime: '2:15', type: 'PIC', studentSigned: true, instructorSigned: true },
        { id: '3', date: '2024-07-10', aircraft: 'G-IJKL', totalTime: '0:45', type: 'Dual', studentSigned: false, instructorSigned: false },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{user.firstName}'s Flight Logbook</CardTitle>
                <CardDescription>A record of all completed flights.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Aircraft</TableHead>
                            <TableHead>Total Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className='text-center'>Signatures</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {placeholderLogbookEntries.length > 0 ? (
                            placeholderLogbookEntries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{entry.date}</TableCell>
                                    <TableCell>{entry.aircraft}</TableCell>
                                    <TableCell>{entry.totalTime}</TableCell>
                                    <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                                    <TableCell>
                                        <div className='flex items-center justify-center gap-4'>
                                            <div className='flex items-center gap-1.5' title="Student Signature">
                                                <span className='text-xs text-muted-foreground'>Stu:</span>
                                                {entry.studentSigned ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                                            </div>
                                            <div className='flex items-center gap-1.5' title="Instructor Signature">
                                                <span className='text-xs text-muted-foreground'>Inst:</span>
                                                {entry.instructorSigned ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No logbook entries found for this user.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
