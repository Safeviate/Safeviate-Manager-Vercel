
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { RiskForm } from '../risk-form';

export default function NewRiskPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  if (isLoadingPersonnel) {
    return <Skeleton className="h-[500px] w-full" />
  }

  // The submission logic is now handled within RiskForm
  return <RiskForm isSubmitting={false} personnel={personnel || []} />;
}
