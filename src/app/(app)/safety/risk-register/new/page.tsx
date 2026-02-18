
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { RiskForm, type RiskFormValues } from '../risk-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { Personnel } from '@/app/(app)/users/personnel/page';

export default function NewRiskPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  const handleCreateRisk = async (data: RiskFormValues) => {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const risksCollection = collection(firestore, `tenants/${tenantId}/risks`);
      
      const riskScore = (data.likelihood || 1) * (data.severity || 1);
      const residualRiskScore = data.residualLikelihood && data.residualSeverity 
        ? data.residualLikelihood * data.residualSeverity 
        : undefined;
      
      const newRisk = {
        ...data,
        riskScore,
        residualRiskScore,
        reviewDate: data.reviewDate ? data.reviewDate.toISOString() : undefined,
        status: 'Open',
      };
      
      // Clean up undefined values before sending to Firestore
      Object.keys(newRisk).forEach(key => newRisk[key as keyof typeof newRisk] === undefined && delete newRisk[key as keyof typeof newRisk]);

      await addDocumentNonBlocking(risksCollection, newRisk);

      toast({
        title: "Risk Added",
        description: "The new risk has been added to the register.",
      });
      router.push('/safety/risk-register');
    } catch (error) {
      console.error("Error creating risk:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the new risk.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPersonnel) {
    return <Skeleton className="h-[500px] w-full" />
  }

  return <RiskForm onSubmit={handleCreateRisk} isSubmitting={isSubmitting} personnel={personnel || []} />;
}
