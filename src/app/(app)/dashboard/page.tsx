'use client';

import { useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { Booking } from '@/types/booking';
import type { SpiConfig } from '../safety/safety-indicators/edit-spi-form';
import { SPICard } from '../safety/safety-indicators/spi-card';
import { AlertTriangle, BookCheck, CalendarClock, Plane, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Aircraft } from '../assets/page';

const kpiCardData = [
    {
        title: "Open Safety Reports",
        icon: AlertTriangle,
        value: 0,
        color: "text-red-500",
        dataKey: "openReports"
    },
    {
        title: "Open CAPs",
        icon: BookCheck,
        value: 0,
        color: "text-yellow-500",
        dataKey: "openCaps"
    },
    {
        title: "Upcoming Bookings (7 days)",
        icon: Plane,
        value: 0,
        color: "text-blue-500",
        dataKey: "upcomingBookings"
    },
];

const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        comparison: 'lower-is-better',
        unit: 'Rate',
        rateFactor: 100,
        description: 'Number of reported unstable approaches per 100 flight hours.',
        target: 0.5,
        levels: {
            acceptable: 0.5,
            monitor: 1.0,
            actionRequired: 1.5,
            urgentAction: 2.0,
        },
        monthlyData: Array(12).fill(0),
    },
    {
        id: 'proactive-reports',
        name: 'Proactive Reports',
        comparison: 'greater-is-better',
        unit: 'Count',
        periodLabel: 'Month',
        description: 'Total number of proactive safety reports filed by personnel.',
        target: 10,
        levels: {
            acceptable: 10,
            monitor: 8,
            actionRequired: 5,
            urgentAction: 2,
        },
        monthlyData: Array(12).fill(0),
    }
];

export default function DashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // --- Data Fetching ---
    const reportsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null,
        [firestore, tenantId]
    );
    const capsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null,
        [firestore, tenantId]
    );
    const bookingsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null,
        [firestore, tenantId]
    );
    const aircraftsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null,
        [firestore, tenantId]
    );

    const { data: reports } = useCollection<SafetyReport>(reportsQuery);
    const { data: caps } = useCollection<CorrectiveActionPlan>(capsQuery);
    const { data: bookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts } = useCollection<Aircraft>(aircraftsQuery);

    const kpiData = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return {
            openReports: reports?.filter(r => r.status === 'Open').length || 0,
            openCaps: caps?.filter(cap => (cap as any).status === 'Open').length || 0,
            upcomingBookings: bookings?.filter(b => {
                if (!b.date) return false;
                const bookingDate = new Date(b.date);
                return bookingDate >= today && bookingDate <= nextWeek && b.status === 'Confirmed';
            }).length || 0
        };
    }, [reports, caps, bookings]);

    const recentReports = useMemo(() => {
        return reports
            ?.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 5);
    }, [reports]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {kpiCardData.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className={`h-4 w-4 text-muted-foreground ${kpi.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpiData[kpi.dataKey as keyof typeof kpiData]}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Aircraft Fleet Hours</CardTitle>
                    <CardDescription>A summary of the current Hobbs and Tacho times for each aircraft.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tail Number</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Hobbs</TableHead>
                                <TableHead>Tacho</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aircrafts && aircrafts.length > 0 ? (
                                aircrafts.map(ac => (
                                    <TableRow key={ac.id}>
                                        <TableCell className="font-medium">{ac.tailNumber}</TableCell>
                                        <TableCell>{ac.model}</TableCell>
                                        <TableCell>{ac.currentHobbs?.toFixed(1) || 'N/A'} hrs</TableCell>
                                        <TableCell>{ac.currentTacho?.toFixed(1) || 'N/A'} hrs</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No aircraft data available.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                 {initialSpiConfig.map(spi => (
                    <SPICard 
                        key={spi.id} 
                        spi={spi} 
                        onEdit={() => {}} // No edit functionality from dashboard
                        reports={reports} 
                        bookings={bookings} 
                    />
                ))}
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Safety Reports</CardTitle>
                    <CardDescription>The 5 most recently filed safety reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Report #</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Event Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentReports && recentReports.length > 0 ? (
                                recentReports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell>{report.reportNumber}</TableCell>
                                        <TableCell>{report.reportType}</TableCell>
                                        <TableCell><Badge variant="secondary">{report.status}</Badge></TableCell>
                                        <TableCell>{format(new Date(report.eventDate), 'PPP')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/safety/safety-reports/${report.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No recent reports.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
