'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";

interface ViewBookingDetailsProps {
    booking: Booking;
}

const DetailItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
    </div>
);

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{booking.type}</CardTitle>
                <CardDescription>
                    Booking ID: {booking.id}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Status" value={booking.status} />
                <DetailItem label="Aircraft ID" value={booking.aircraftId} />
                <DetailItem label="Date" value={format(new Date(booking.start), 'PPP')} />
                <DetailItem label="Start Time" value={format(new Date(booking.start), 'p')} />
                <DetailItem label="End Time" value={format(new Date(booking.end), 'p')} />
                <DetailItem label="Instructor ID" value={booking.instructorId} />
                <DetailItem label="Student ID" value={booking.studentId} />
                <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                </div>
            </CardContent>
        </Card>
    );
}
