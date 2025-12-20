
'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewMocForm, type NewMocFormValues } from './new-moc-form';
import type { ManagementOfChange } from '@/types/moc';
import type { Department } from '@/app/(app)/admin/department/page';
import type { Personnel } from '@/app/(app)/users/personnel/page';

const getMocPrefix = (): string => 'MOC';

export default function NewMocPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = 'safeviate'; // Hardcoded for now

  // Fetch departments and personnel for the form dropdowns
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'departments') : null),
    [firestore]
  );
  const personnelQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'personnel') : null),
    [firestore]
  );

  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

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
  
  if (!user || isLoadingDepts || isLoadingPersonnel) {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    )
  }

  return (
    <NewMocForm 
        onSubmit={handleNewMoc}
        isSubmitting={isSubmitting}
        departments={departments || []}
        personnel={personnel || []}
    />
  );
}
