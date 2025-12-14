'use client';

import { use, useMemo } from 'react';
import { MassBalanceTemplateForm, type AircraftModelProfile } from '../../template-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface EditTemplatePageProps {
    params: { id: string };
}

export default function EditMassBalanceTemplatePage({ params }: EditTemplatePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const profileId = resolvedParams.id;
    
    const profileDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircraftModelProfiles', profileId) : null),
        [firestore, tenantId, profileId]
    );

    const { data: profile, isLoading, error } = useDoc<AircraftModelProfile>(profileDocRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[60vh] w-full" />
            </div>
        )
    }

    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>
    }
    
    return (
        <div className="space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/assets/mass-balance">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Mass & Balance
                    </Link>
                </Button>
            </div>
            <MassBalanceTemplateForm tenantId={tenantId} initialData={profile} />
        </div>
    );
}
