'use client';

import type { Booking } from '@/types/booking';

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
}

/**
 * NavlogBuilder - Placeholder Shell
 * Rebuilding from scratch to ensure high-density adherence to UI Source of Truth.
 */
export function NavlogBuilder({ booking, tenantId }: NavlogBuilderProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background min-h-[600px]">
            <div className="max-w-md space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-black text-primary">NAV</span>
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase tracking-tight">Navlog Rebuild Pending</h3>
                    <p className="text-sm text-muted-foreground font-medium italic">
                        This area is prepared for the new high-density navigation log for Booking #{booking.bookingNumber}.
                    </p>
                </div>
            </div>
        </div>
    );
}
