'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AircraftChecklistHistory() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Checklist History</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Checklist history will be displayed here.</p>
            </CardContent>
        </Card>
    );
}
