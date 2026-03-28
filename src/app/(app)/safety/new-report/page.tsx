'use client';

import { useState } from 'react';
import { NewSafetyReportForm, type NewSafetyReportValues } from './new-safety-report-form';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { SafetyReport } from '@/types/safety-report';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Aircraft } from '@/types/aircraft';
import { useCollection } from '@/firebase';

const getReportTypePrefix = (type: NewSafetyReportValues['reportType']): string => {
    switch (type) {
        case 'Flight Operations': return 'FLT';
        case 'Aircraft Defect': return 'ADR';
        case 'Ground Operations': return 'GRD';
        case 'General Safety Concern': return 'GEN';
        default: return 'REP';
    }
}

export default function NewSafetyReportPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tenantId } = useUserProfile();
  const aircraftsRef = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts } = useCollection<Aircraft>(aircraftsRef);

  const handleNewReport = async (values: NewSafetyReportValues) => {
    if (!firestore || !user || !tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to file a report.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
        const reportPrefix = getReportTypePrefix(values.reportType);
        const reportsRef = collection(firestore, `tenants/${tenantId}/safety-reports`);
        const counterRef = doc(firestore, `tenants/${tenantId}/counters`, `safety-reports-${reportPrefix}`);

        const newReportId = await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let newReportNumberSuffix = 1;
            if (counterDoc.exists()) {
                newReportNumberSuffix = (counterDoc.data().currentNumber || 0) + 1;
            }
            
            const newReportNumber = `${reportPrefix}-${String(newReportNumberSuffix).padStart(3, '0')}`;
            transaction.set(counterRef, { currentNumber: newReportNumberSuffix }, { merge: true });

            const newReportRef = doc(reportsRef);
            
            const reportData: Omit<SafetyReport, 'id'> = {
                reportNumber: newReportNumber,
                reportType: values.reportType,
                status: 'Open',
                submittedBy: user.uid,
                submittedByName: values.isAnonymous ? 'Anonymous' : user.displayName || user.email || 'Unknown User',
                submittedAt: new Date().toISOString(),
                isAnonymous: values.isAnonymous,
                eventDate: format(values.eventDate, 'yyyy-MM-dd'),
                eventTime: values.eventTime,
                location: values.location,
                description: values.description,
                phaseOfFlight: values.phaseOfFlight,
                systemOrComponent: values.systemOrComponent,
            };

            transaction.set(newReportRef, reportData);
            return newReportRef.id;
        });

      toast({
        title: 'Report Submitted',
        description: 'Your safety report has been successfully filed.',
      });

      router.push(`/safety/safety-reports/${newReportId}`);

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred while submitting the report.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  

  return (
    <NewSafetyReportForm 
        aircrafts={aircrafts || []}
        onSubmit={handleNewReport}
        isSubmitting={isSubmitting}
    />
  );
}
