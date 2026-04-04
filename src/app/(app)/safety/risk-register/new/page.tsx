'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { RiskForm } from '../risk-form';

export default function NewRiskPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/personnel', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled) setPersonnel(payload?.personnel ?? []);
      } catch {
        if (!cancelled) setPersonnel([]);
      } finally {
        if (!cancelled) setIsLoadingPersonnel(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoadingPersonnel) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return <RiskForm personnel={personnel || []} />;
}
