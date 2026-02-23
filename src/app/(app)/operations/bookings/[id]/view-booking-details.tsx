'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from "@/types/aircraft";
import type { PilotProfile } from "@/app/(app)/users/personnel/page";

interface ViewBookingDetailsProps {
    booking: Booking;
    aircraft: Aircraft | null;
    instructor: PilotProfile | null;
    student: PilotProfile | null;
}

const DetailItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
    </div>
);

export function ViewBookingDetails({ booking, aircraft, instructor, student }: ViewBookingDetailsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{booking.title}</CardTitle>
                <CardDescription>
                    Booking ID: {booking.id}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Status" value={booking.status} />
                <DetailItem label="Aircraft" value={`${aircraft?.make || ''} ${aircraft?.model || ''} (${aircraft?.tailNumber || 'N/A'})`} />
                <DetailItem label="Date" value={format(new Date(booking.start), 'PPP')} />
                <DetailItem label="Start Time" value={format(new Date(booking.start), 'p')} />
                <DetailItem label="End Time" value={format(new Date(booking.end), 'p')} />
                <DetailItem label="Instructor" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : 'N/A'} />
                <DetailItem label="Student" value={student ? `${student.firstName} ${student.lastName}` : 'N/A'} />
                <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                </div>
            </CardContent>
        </Card>
    );
}
