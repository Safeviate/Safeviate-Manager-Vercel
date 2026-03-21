'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LogbookPage() {
    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
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
        </div>
    );
}
