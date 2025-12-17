
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { Aircraft } from '../../../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

interface ChecklistPageProps {
    params: { id: string };
}

const requiredAircraftDocuments = [
    'Certificate of Release to service',
    'Certificate of Registration',
    'Certificate of Airworthiness',
    'Radio',
    'Insurance',
];


export default function ChecklistPage({ params }: ChecklistPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
    const checklistType = searchParams.get('type') || 'pre-flight';
    
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);
    
    const handleCheckboxChange = (itemName: string, isChecked: boolean) => {
        setCheckedItems(prev => ({ ...prev, [itemName]: isChecked }));
    };

    const handleSubmit = async () => {
        if (!aircraftDocRef || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Database connection not available.',
            });
            return;
        }

        const checklistData = {
            aircraftId,
            checklistType,
            submissionTime: Timestamp.now(),
            checkedItems,
        };

        try {
            // 1. Save the checklist
            const checklistCollectionRef = collection(firestore, aircraftDocRef.path, 'completed-checklists');
            await addDoc(checklistCollectionRef, checklistData);

            // 2. Update the aircraft status
            const newStatus = checklistType === 'pre-flight' ? 'needs-post-flight' : 'ready';
            await updateDocumentNonBlocking(aircraftDocRef, { checklistStatus: newStatus });
            
            toast({
                title: "Checklist Submitted",
                description: `The ${checklistType.replace('-', ' ')} checklist has been saved.`,
            });
        } catch (e) {
            console.error("Error submitting checklist: ", e);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "There was an error saving the checklist.",
            });
        }
    };

    if (isLoading) {
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        );
    }
    
    if (error) {
        return <div className="text-destructive text-center">Error: {error.message}</div>;
    }

    if (!aircraft) {
        return <div className="text-center">Aircraft not found.</div>;
    }
    
    // Combine required static docs with docs uploaded to the aircraft
    const allChecklistDocs = Array.from(new Set([...requiredAircraftDocuments, ...(aircraft.documents?.map(d => d.name) || [])]));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/assets/${aircraftId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Aircraft
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="capitalize">{checklistType.replace('-', ' ')} Checklist</CardTitle>
                    <CardDescription>
                        Complete the required checks for aircraft <span className='font-bold'>{aircraft.tailNumber}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {checklistType === 'pre-flight' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Onboard Documents</h3>
                            <p className="text-sm text-muted-foreground">Confirm that all required documents are present on the aircraft.</p>
                            <div className="space-y-3 rounded-lg border p-4">
                                {allChecklistDocs.map(docName => (
                                    <div key={docName} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={docName}
                                            checked={checkedItems[docName] || false}
                                            onCheckedChange={(checked) => handleCheckboxChange(docName, !!checked)}
                                        />
                                        <Label htmlFor={docName} className="font-normal text-base cursor-pointer">
                                            {docName}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {checklistType === 'post-flight' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center p-4 border rounded-lg">Post-flight checklist items will be displayed here.</p>
                        </div>
                     )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit}>Submit Checklist</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
