'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QualityRiskPlanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/quality/task-tracker');
  }, [router]);

  return null;
}
