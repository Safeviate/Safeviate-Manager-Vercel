'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Maintenance"
      description="Maintenance workflows are only available for aviation tenants."
      backHref="/dashboard"
    >
      {children}
    </IndustryRouteGuard>
  );
}
