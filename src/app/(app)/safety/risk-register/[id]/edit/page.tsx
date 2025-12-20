'use client';

import { use } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { RiskForm } from '../../risk-form';
import type { Risk } from '../../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface EditRiskPageProps {
  params: { id: string };
}

export default function EditRiskPage({ params }: EditRiskPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const riskRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'risks', resolvedParams.id) : null),
    [firestore, tenantId, resolvedParams.id]
  );

  const { data: risk, isLoading, error } = useDoc<Risk>(riskRef);

  if (isLoading) {
    return (
        <div className='max-w-4xl mx-auto space-y-6'>
            <Skeleton className='h-96 w-full' />
            <div className='flex justify-end gap-2'>
                <Skeleton className='h-10 w-24' />
                <Skeleton className='h-10 w-24' />
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className='max-w-4xl mx-auto'>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Could not load risk data: {error.message}
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  if (!risk) {
     return (
        <div className='max-w-4xl mx-auto'>
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>
                    The requested risk could not be found.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <RiskForm existingRisk={risk} />;
}
