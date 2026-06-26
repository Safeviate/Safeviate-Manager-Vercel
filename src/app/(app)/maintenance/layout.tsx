'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Maintenance"
      description="Maintenance workflows are not currently available."
      backHref="/dashboard"
    >
      {children}
    </IndustryRouteGuard>
  );
}
