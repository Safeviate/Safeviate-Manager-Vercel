'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function BookingsLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Bookings"
      description="Booking workflows are not available for the current aviation sector."
      backHref="/dashboard"
    >
      {children}
    </IndustryRouteGuard>
  );
}
