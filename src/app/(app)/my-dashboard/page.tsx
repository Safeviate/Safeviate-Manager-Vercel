'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan } from '@/types/quality';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../users/personnel/page';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, differenceInDays, isFuture } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DocumentExpirySettings } from '../admin/document-dates/page';
import { MyLogbook } from './my-logbook';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function MyDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // --- Data Queries ---
    const safetyReportsQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `tenants/${tenantId}/safety-reports`),
            where('investigationTeam', 'array-contains', { userId: user.uid })
        ) : null,
        [firestore, tenantId, user]
    );

    const capsQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `tenants/${tenantId}/corrective-action-plans`),
            where('responsiblePersonId', '==', user.uid),
            where('status', '==', 'Open')
        ) : null,
        [firestore, tenantId, user]
    );
    
    const bookingsQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `tenants/${tenantId}/bookings`),
            where('pilotId', '==', user.uid),
            where('status', '==', 'Confirmed')
        ) : null,
        [firestore, tenantId, user]
    );

    const userProfileQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, `tenants/${tenantId}/pilots`),
            where('id', '==', user.uid)
        ) : null,
        [firestore, tenantId, user]
    );
    
    const expirySettingsQuery = useMemoFirebase(
        () => firestore ? query(
            collection(firestore, `tenants/${tenantId}/settings`),
            where('id', '==', 'document-expiry')
        ) : null,
        [firestore, tenantId]
    );

    // --- Data Fetching ---
    const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(safetyReportsQuery);
    const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: userProfileData, isLoading: isLoadingProfile } = useCollection<PilotProfile>(userProfileQuery);
    const { data: expirySettings, isLoading: isLoadingExpiry } = useCollection<DocumentExpirySettings>(expirySettingsQuery);

    const userProfile = userProfileData?.[0];

    const isLoading = isUserLoading || isLoadingReports || isLoadingCaps || isLoadingBookings || isLoadingProfile || isLoadingExpiry;

    // --- Memoized Data Processing ---

    const myTasks = useMemo(() => {
        if (!user) return [];
        const tasks = [];
        // Investigation tasks
        reports?.forEach(r => {
            r.investigationTasks?.forEach(t => {
                if (t.assigneeId === user.uid && t.status !== 'Completed') {
                    tasks.push({ id: `inv-${t.id}`, description: t.description, dueDate: t.dueDate, type: 'Investigation', link: `/safety/safety-reports/${r.id}` });
                }
            });
        });
        // CAPs
        caps?.forEach(c => {
             tasks.push({ id: `cap-${c.id}`, description: c.rootCauseAnalysis, dueDate: c.dueDate, type: 'Corrective Action', link: `/quality/cap-tracker` });
        });
        return tasks.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }, [user, reports, caps]);

    const upcomingBookings = useMemo(() => {
        return bookings
            ?.filter(b => isFuture(new Date(b.bookingDate)))
            .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
            .slice(0, 5);
    }, [bookings]);
    
    const documentStatus = useMemo(() => {
        if (!userProfile?.documents) return [];
        const settings = expirySettings?.[0];
        
        return userProfile.documents.map(doc => {
            let status: 'Valid' | 'Warning' | 'Expired' = 'Valid';
            let color = settings?.defaultColor || '#22c55e';

            if (doc.expirationDate) {
                const daysLeft = differenceInDays(new Date(doc.expirationDate), new Date());
                if (daysLeft < 0) {
                    status = 'Expired';
                    color = settings?.expiredColor || '#ef4444';
                } else if (settings?.warningPeriods) {
                    const sortedPeriods = [...settings.warningPeriods].sort((a, b) => a.period - b.period);
                    for (const p of sortedPeriods) {
                        if (daysLeft <= p.period) {
                            status = 'Warning';
                            color = p.color;
                            break;
                        }
                    }
                }
            }
            return { name: doc.name, expirationDate: doc.expirationDate, status, color };
        });

    }, [userProfile, expirySettings]);

    if (isLoading) {
        return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
    }

    return (
        <Tabs defaultValue="information" className="space-y-6">
            <TabsList>
                <TabsTrigger value="information">Information</TabsTrigger>
                {isPilotProfile(userProfile) && <TabsTrigger value="logbook">Logbook</TabsTrigger>}
            </TabsList>
            <TabsContent value="information">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>My Tasks</CardTitle>
                            <CardDescription>A list of investigation tasks and corrective actions assigned to you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Link</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myTasks.length > 0 ? myTasks.map(task => (
                                        <TableRow key={task.id}>
                                            <TableCell>{task.description}</TableCell>
                                            <TableCell><Badge variant="outline">{task.type}</Badge></TableCell>
                                            <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={task.link}>View</Link></Button></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No outstanding tasks assigned to you.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>My Upcoming Bookings</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Aircraft</TableHead>
                                        <TableHead>Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcomingBookings && upcomingBookings.length > 0 ? upcomingBookings.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{format(new Date(booking.bookingDate), 'PPP')} {booking.startTime}</TableCell>
                                            <TableCell>{booking.aircraftId}</TableCell>
                                            <TableCell>{booking.type}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No upcoming bookings.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>My Document Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Expires</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documentStatus.length > 0 ? documentStatus.map(doc => (
                                        <TableRow key={doc.name}>
                                            <TableCell className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: doc.color}} />
                                                {doc.name}
                                            </TableCell>
                                            <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={2} className="h-24 text-center">No documents found or required.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            {isPilotProfile(userProfile) && (
                 <TabsContent value="logbook">
                    <MyLogbook userProfile={userProfile} />
                </TabsContent>
            )}
        </Tabs>
    );
}
function isPilotProfile(userProfile: PilotProfile | undefined): userProfile is PilotProfile {
    if (!userProfile) return false;
    const pilotTypes: Array<PilotProfile['userType']> = ['Student', 'Private Pilot', 'Instructor'];
    return pilotTypes.includes(userProfile.userType);
}

    

    