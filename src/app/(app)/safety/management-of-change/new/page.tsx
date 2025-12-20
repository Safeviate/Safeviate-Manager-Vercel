'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewMocForm, type NewMocFormValues } from './new-moc-form';
import type { ManagementOfChange } from '@/types/moc';


const getMocPrefix = (): string => 'MOC';

export default function NewMocPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate'; // Hardcoded for now

  const handleNewMoc = async (values: NewMocFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to propose a change.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
        const mocPrefix = getMocPrefix();
        const mocsRef = collection(firestore, `tenants/${tenantId}/management-of-change`);
        const counterRef = doc(firestore, `tenants/${tenantId}/counters`, `moc-${mocPrefix}`);

        const newMocId = await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let newSuffix = 1;
            if (counterDoc.exists()) {
                newSuffix = (counterDoc.data().currentNumber || 0) + 1;
            }
            
            const newMocNumber = `${mocPrefix}-${String(newSuffix).padStart(3, '0')}`;
            transaction.set(counterRef, { currentNumber: newSuffix }, { merge: true });

            const newMocRef = doc(mocsRef);
            
            const mocData: Omit<ManagementOfChange, 'id'> = {
                mocNumber: newMocNumber,
                title: values.title,
                description: values.description,
                reason: values.reason,
                scope: values.scope,
                proposingDepartmentId: values.proposingDepartmentId,
                responsiblePersonId: values.responsiblePersonId,
                status: 'Proposed',
                proposedBy: user.uid,
                proposalDate: new Date().toISOString(),
                phases: [], // Start with empty phases
            };

            transaction.set(newMocRef, mocData);
            return newMocRef.id;
        });

      toast({
        title: 'Change Proposed',
        description: 'Your Management of Change proposal has been successfully filed.',
      });

      router.push(`/safety/management-of-change/${newMocId}`);

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred while submitting the proposal.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // NOTE: This component needs to fetch departments and personnel for the form dropdowns
  // For now, we will pass empty arrays. This will be part of a future step.
  if (!user) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <NewMocForm 
        onSubmit={handleNewMoc}
        isSubmitting={isSubmitting}
        departments={[]} // Placeholder
        personnel={[]} // Placeholder
    />
  );
}
