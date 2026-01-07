
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyDashboardPage() {
    return (
        <div className="w-full space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>My Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-10">
                        This page is under construction.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
