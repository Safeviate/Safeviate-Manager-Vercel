'use client';

import type { ReactNode } from 'react';
import { IndustryRouteGuard } from '@/components/industry-route-guard';

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <IndustryRouteGuard
      sectionLabel="Operations"
      description="This operations workspace is not currently available."
      backHref="/dashboard"
    >
      {children}
    </IndustryRouteGuard>
  );
}
