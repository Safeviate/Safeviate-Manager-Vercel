'use client';

import { useDashboardData } from '@/hooks/use-dashboard-data';
import { MainPageHeader } from "@/components/page-header";
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function MessagesPage() {
    const { myMessages, isLoading } = useDashboardData();

    if (isLoading) return (
        <div className="max-w-[1100px] mx-auto w-full space-y-6">
            <Skeleton className="h-64 w-full" />
        </div>
    );

    return (
        <div className="max-w-[1100px] mx-auto w-full space-y-6">
            <Card className="shadow-none border">
                <MainPageHeader 
                    title="Messages" 
                />
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
        </div>
    );
}
