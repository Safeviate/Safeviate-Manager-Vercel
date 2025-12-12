
'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingDetailsPageProps {
    params: { id: string };
}

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
    const resolvedParams = use(params);
    const bookingId = resolvedParams.id;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This is a placeholder for the booking details.</p>
                <p className="mt-4 font-mono text-sm text-muted-foreground">Booking ID: {bookingId}</p>
            </CardContent>
        </Card>
    );
}
