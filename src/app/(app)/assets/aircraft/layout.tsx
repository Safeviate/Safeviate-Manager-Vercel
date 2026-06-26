'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function AircraftLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Aircraft"
      description="Aircraft management is not currently available."
      backHref="/assets"
    >
      {children}
    </IndustryRouteGuard>
  );
}
