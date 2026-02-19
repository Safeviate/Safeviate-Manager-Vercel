'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AddAircraftForm, type AddAircraftFormValues } from './add-aircraft-form';

export default function AddAircraftPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const tenantId = 'safeviate';

    const handleAddAircraft = async (values: AddAircraftFormValues) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
            await addDocumentNonBlocking(aircraftsCollection, values);
            toast({ title: 'Aircraft Added', description: `Aircraft ${values.tailNumber} has been added.` });
            router.push('/assets');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return <AddAircraftForm onSubmit={handleAddAircraft} isSubmitting={isSubmitting} />;
}
