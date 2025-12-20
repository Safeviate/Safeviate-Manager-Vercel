
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { RiskForm, type RiskFormValues } from '../risk-form';

export default function NewRiskPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate';

  const handleCreateRisk = async (data: RiskFormValues) => {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const risksCollection = collection(firestore, `tenants/${tenantId}/risks`);
      const riskScore = (data.likelihood || 1) * (data.severity || 1);
      
      const newRisk = {
        ...data,
        riskScore,
        status: 'Open',
        mitigation: '',
        residualLikelihood: undefined,
        residualSeverity: undefined,
        residualRiskScore: undefined,
      };

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
      setIsSubmitting(false);
    }
  };

  return <RiskForm onSubmit={handleCreateRisk} isSubmitting={isSubmitting} />;
}
