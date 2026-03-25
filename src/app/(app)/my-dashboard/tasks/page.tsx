'use client';

import { useDashboardData } from '@/hooks/use-dashboard-data';
import { MainPageHeader } from "@/components/page-header";
import { Card, CardContent } from '@/components/ui/card';
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
                <MainPageHeader 
                    title="My Outstanding Tasks" 
                />
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%] text-[10px] uppercase font-bold tracking-wider">Task</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Source</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Due Date</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myTasks.length > 0 ? (
                                myTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-bold text-sm text-foreground">{task.description}</TableCell>
                                        <TableCell>
                                            <span className="text-sm font-black uppercase text-foreground tracking-tight">
                                                {task.sourceIdentifier}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-foreground">{format(new Date(task.dueDate), 'PPP')}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px] font-black uppercase py-1 px-3">
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-black uppercase border-slate-300">
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
