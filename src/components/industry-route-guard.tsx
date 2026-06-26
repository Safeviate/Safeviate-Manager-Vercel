'use client';

import type { ReactNode } from 'react';

type IndustryRouteGuardProps = {
  children: ReactNode;
  sectionLabel?: string;
  description?: string;
  backHref?: string;
};

export function IndustryRouteGuard({ children }: IndustryRouteGuardProps) {
  return <>{children}</>;
}
