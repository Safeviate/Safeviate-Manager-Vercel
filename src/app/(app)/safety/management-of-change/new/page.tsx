'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { NewMocForm, type NewMocFormValues } from './new-moc-form';
import type { Department } from '@/app/(app)/admin/department/page';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { useUserProfile } from '@/hooks/use-user-profile';
import { parseJsonResponse } from '@/lib/safe-json';

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

const getMocPrefix = (): string => 'MOC';

function NewMocContent() {
  const { userProfile, tenantId, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orgId = searchParams.get('orgId');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!tenantId) {
        setIsLoadingDepts(false);
        setIsLoadingPersonnel(false);
        return;
      }
      try {
        const personnelRes = await fetch('/api/personnel', { cache: 'no-store' });
        const personnelPayload = await parseJsonResponse<{ departments?: Department[]; personnel?: Personnel[] }>(personnelRes);
        if (cancelled) return;
        setDepartments(personnelPayload?.departments ?? []);
        setPersonnel(personnelPayload?.personnel ?? []);
      } finally {
        if (!cancelled) {
          setIsLoadingDepts(false);
          setIsLoadingPersonnel(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [tenantId]);

  const handleNewMoc = async (values: NewMocFormValues) => {
    if (!userProfile || !tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to propose a change.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/management-of-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moc: {
            mocNumber: `${getMocPrefix()}-${String(Date.now()).slice(-3)}`,
            title: values.title,
            description: values.description,
            reason: values.reason,
            scope: values.scope,
            proposingDepartmentId: values.proposingDepartmentId,
            responsiblePersonId: values.responsiblePersonId,
            status: 'Proposed',
            proposedBy: userProfile.id,
            proposalDate: toNoonUtcIso(new Date()),
            phases: [],
            organizationId: orgId === 'internal' ? null : orgId,
          },
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<{ error?: string }>(response);
        throw new Error(payload?.error || 'Unable to submit MOC proposal.');
      }
      const payload = await parseJsonResponse<{ moc?: { id?: string } }>(response);
      const newMocId = payload?.moc?.id;

      toast({
        title: 'Change Proposed',
        description: 'Your Management of Change proposal has been successfully filed.',
      });

      if (newMocId) router.push(`/safety/management-of-change/${newMocId}`);

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
  
  if (isProfileLoading || !userProfile || isLoadingDepts || isLoadingPersonnel) {
    return (
        <div className="max-w-4xl mx-auto space-y-8 p-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-64 w-full rounded-2xl" />
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

export default function NewMocPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <NewMocContent />
        </Suspense>
    )
}
