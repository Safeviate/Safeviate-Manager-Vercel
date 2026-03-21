'use client';

import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import { useMemo } from 'react';

export default function MyDashboardPage() {
    const { myTasks, myMessages, isLoading, userProfile, tenant } = useDashboardData();
    
    const hiddenMenus = useMemo(() => new Set(userProfile?.accessOverrides?.hiddenMenus || []), [userProfile]);
    const disabledMenus = useMemo(() => new Set(tenant?.enabledMenus ? [] : []), [tenant]); // Simplified for now
    
    // Check if a specific menu is hidden or disabled
    const isHidden = (href: string) => {
        if (hiddenMenus.has(href)) return true;
        if (tenant?.enabledMenus && !tenant.enabledMenus.includes(href)) return true;
        return false;
    };

    const availableTabs = useMemo(() => {
        return [
            { id: 'tasks', label: 'Tasks', href: '/my-dashboard/tasks' },
            { id: 'messages', label: 'Messages', href: '/my-dashboard/messages', showBadge: true },
            { id: 'logbook', label: 'My Logbook', href: '/my-dashboard/logbook' },
        ].filter(tab => !isHidden(tab.href));
    }, [userProfile, tenant]);

    if (isLoading) return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (availableTabs.length === 0) return (
        <div className="max-w-[1200px] mx-auto w-full text-center py-20">
            <p className="text-muted-foreground italic">No dashboard modules are currently enabled for your account.</p>
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Tabs defaultValue={availableTabs[0].id} className="w-full flex flex-col h-full overflow-hidden">
                <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 shrink-0 border-b-0 overflow-x-auto no-scrollbar justify-start w-full flex">
                    {availableTabs.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                            {tab.label}
                            {tab.id === 'messages' && myMessages.length > 0 && (
                                <Badge className="ml-2 h-4 px-1.5 min-w-4 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">{myMessages.length}</Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="tasks" className="mt-0">
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
                </TabsContent>

                <TabsContent value="messages" className="mt-0">
                    <Card className="shadow-none border">
                        <CardHeader>
                            <CardTitle>Messages</CardTitle>
                            <CardDescription>Recent assignments and mentions directed to you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {myMessages.length > 0 ? (
                                    myMessages.map(msg => (
                                        <div key={msg.id} className="flex flex-col gap-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold">{msg.from}</span>
                                                <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), 'PPP p')}</span>
                                            </div>
                                            <p className="text-sm line-clamp-2 italic text-muted-foreground">&quot;{msg.content}&quot;</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <Badge variant="outline" className="text-[10px]">{msg.source}</Badge>
                                                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                                                    <Link href={msg.link}>View Discussion</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-muted-foreground">You have no new messages.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logbook" className="mt-0">
                    <Card className="shadow-none border">
                        <CardHeader>
                            <CardTitle>My Logbook</CardTitle>
                            <CardDescription>A dynamic view of your recent flight activities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10">
                                <p className="text-muted-foreground mb-4">The logbook feature is currently disabled.</p>
                                <Button asChild>
                                    <Link href="/development/table-builder">Go to Table Builder</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}