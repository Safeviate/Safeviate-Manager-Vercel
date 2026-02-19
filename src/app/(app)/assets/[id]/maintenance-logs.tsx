'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface MaintenanceLogsProps {
    aircraftId: string;
}

export function MaintenanceLogs({ aircraftId }: MaintenanceLogsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Maintenance Logs</CardTitle>
                <CardDescription>
                    A history of all maintenance performed on this aircraft.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center">Maintenance log functionality is under construction.</p>
            </CardContent>
        </Card>
    )
}
