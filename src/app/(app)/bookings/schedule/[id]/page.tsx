'use client';

import { use, useEffect, useState } from 'react';
import type { Booking } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewBookingDetails } from './view-booking-details';
import { BackNavButton } from '@/components/back-nav-button';
import { useUserProfile } from '@/hooks/use-user-profile';

interface BookingDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
    const resolvedParams = use(params);
    const { tenantId } = useUserProfile();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadBooking = async (options?: { silent?: boolean }) => {
            if (!tenantId) {
                setIsLoading(false);
                return;
            }

            if (!options?.silent) {
                setIsLoading(true);
            }
            setError(null);

            try {
                const res = await fetch('/api/schedule-data');
                if (!res.ok) throw new Error('Failed to load booking.');
                const data = await res.json();
                const found = (data.bookings || []).find((item: Booking) => item.id === resolvedParams.id) || null;
                if (!cancelled) setBooking(found);
            } catch (err: any) {
                if (!cancelled) setError(err?.message || 'Failed to load booking.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadBooking();
        const handleBookingUpdate = () => {
            loadBooking({ silent: true });
        };
        window.addEventListener('safeviate-bookings-updated', handleBookingUpdate);
        return () => {
            cancelled = true;
            window.removeEventListener('safeviate-bookings-updated', handleBookingUpdate);
        };
    }, [resolvedParams.id, tenantId]);

    if (isLoading) {
        return (
        <div className="mx-auto flex h-full w-full max-w-[1100px] min-h-0 flex-col gap-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="min-h-0 flex-1 w-full" />
            </div>
        )
    }

    if (error || !booking) {
        return (
        <div className="max-w-[1100px] mx-auto w-full text-center py-10">
                <p className="text-destructive mb-4">
                    {error ? `Error: ${error}` : "Booking not found."}
                </p>
                <BackNavButton href="/bookings/schedule" text="Back to Daily Schedule" />
            </div>
        )
    }

    return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-1 flex-col gap-4 sm:gap-6">
            <div className="min-h-[calc(100dvh-11rem)] flex-1 overflow-hidden">
            <ViewBookingDetails
                booking={booking}
            />
            </div>
        </div>
    );
}
