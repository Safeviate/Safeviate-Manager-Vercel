'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function AircraftLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Aircraft"
      description="Aircraft management is only available for aviation tenants."
      backHref="/assets"
    >
      {children}
    </IndustryRouteGuard>
  );
}
