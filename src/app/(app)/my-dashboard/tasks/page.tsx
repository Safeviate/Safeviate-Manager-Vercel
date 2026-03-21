'use client';

import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

export default function TasksPage() {
    const { myTasks, isLoading } = useDashboardData();

    if (isLoading) return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Skeleton className="h-64 w-full" />
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Card className="shadow-none border">
                <CardHeader>
                    <CardTitle>My Outstanding Tasks</CardTitle>
                    <CardDescription>A list of all tasks assigned to you across all modules.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%] text-xs uppercase font-bold">Task</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Source</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Due Date</TableHead>
                                <TableHead className="text-xs uppercase font-bold">Status</TableHead>
                                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myTasks.length > 0 ? (
                                myTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium text-xs">{task.description}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px]">{task.sourceIdentifier}</Badge></TableCell>
                                        <TableCell className="text-xs">{format(new Date(task.dueDate), 'PPP')}</TableCell>
                                        <TableCell><Badge variant="secondary" className="text-[10px] py-0">{task.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                                                <Link href={task.link}>
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-sm">
                                        You have no outstanding tasks.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
