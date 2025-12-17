
'use client';

import { use, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, collection, Timestamp } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ChecklistResponse, ChecklistItemResponse } from '@/types/checklist';
import { Input } from '@/components/ui/input';
import type { FeatureSettings } from '@/app/(app)/admin/features/page';


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
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { toast } = useToast();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;
    const checklistType = searchParams.get('type') || 'pre-flight';
    
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [hobbs, setHobbs] = useState('');
    const [tacho, setTacho] = useState('');

    const bookingDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
        [firestore, tenantId, bookingId]
    );

    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftDocRef = useMemoFirebase(
        () => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null),
        [firestore, tenantId, booking]
    );
    
    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    
    const featureSettingsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'features') : null),
        [firestore, tenantId]
    );
    const { data: featureSettings } = useDoc<FeatureSettings>(featureSettingsRef);

    useEffect(() => {
        if (checklistType === 'pre-flight' && aircraft) {
            setHobbs(aircraft.currentHobbs?.toString() || '');
            setTacho(aircraft.currentTacho?.toString() || '');
        }
    }, [checklistType, aircraft]);


    const isLoading = isLoadingBooking || isLoadingAircraft;
    const error = bookingError || aircraftError;

    const handleCheckboxChange = (itemName: string, isChecked: boolean) => {
        setCheckedItems(prev => ({ ...prev, [itemName]: isChecked }));
    };

    const handleSubmit = async () => {
        if (!firestore || !booking || !aircraft) {
            toast({ variant: "destructive", title: "Error", description: "Missing required data to submit checklist." });
            return;
        }

        const responses: ChecklistItemResponse[] = Object.entries(checkedItems)
            .filter(([, checked]) => checked)
            .map(([itemId, checked]) => ({ itemId, checked }));

        if(hobbs) responses.push({ itemId: `${checklistType}-hobbs`, checked: false, hobbs: Number(hobbs) });
        if(tacho) responses.push({ itemId: `${checklistType}-tacho`, checked: false, tacho: Number(tacho) });
        
        const checklistResponse: Omit<ChecklistResponse, 'id'> = {
            bookingId: booking.id,
            pilotId: booking.pilotId,
            checklistType: checklistType as 'pre-flight' | 'post-flight',
            submissionTime: Timestamp.now(),
            responses,
        };

        try {
            const checklistCollectionRef = collection(firestore, 'tenants', tenantId, 'checklistResponses');
            await addDocumentNonBlocking(checklistCollectionRef, checklistResponse);

            toast({
                title: "Checklist Submitted",
                description: `The ${checklistType.replace('-', ' ')} checklist has been saved.`,
            });
            
            // Only update aircraft status if the feature is enabled
            if (featureSettings?.preFlightChecklistRequired) {
                const aircraftUpdateData: Partial<Aircraft> = {
                    currentHobbs: Number(hobbs) || aircraft.currentHobbs,
                    currentTacho: Number(tacho) || aircraft.currentTacho,
                    checklistStatus: checklistType === 'pre-flight' ? 'needs-post-flight' : 'ready'
                };
                updateDocumentNonBlocking(aircraftDocRef!, aircraftUpdateData);
            }

        } catch (e) {
            console.error("Failed to submit checklist:", e);
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

    if (!booking || !aircraft) {
        return <div className="text-center">Booking or Aircraft not found.</div>;
    }
    
    // Combine required static docs with docs uploaded to the aircraft
    const allChecklistDocs = Array.from(new Set([...requiredAircraftDocuments, ...(aircraft.documents?.map(d => d.name) || [])]));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/operations/bookings/${bookingId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Booking
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className='capitalize'>{checklistType.replace('-', ' ')} Checklist</CardTitle>
                    <CardDescription>
                        Complete the required checks for booking #{booking.bookingNumber} on aircraft <span className='font-bold'>{aircraft.tailNumber}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="hobbs">Hobbs Reading</Label>
                            <Input id="hobbs" type="number" value={hobbs} onChange={e => setHobbs(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tacho">Tacho Reading</Label>
                            <Input id="tacho" type="number" value={tacho} onChange={e => setTacho(e.target.value)} />
                        </div>
                    </div>
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
                            <p className="text-sm text-muted-foreground text-center">Additional post-flight checklist items will be displayed here.</p>
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
