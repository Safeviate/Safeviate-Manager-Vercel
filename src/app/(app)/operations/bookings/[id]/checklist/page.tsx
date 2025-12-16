
'use client';

import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
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
    
    const isLoading = isLoadingBooking || isLoadingAircraft;
    const error = bookingError || aircraftError;

    const handleCheckboxChange = (itemName: string, isChecked: boolean) => {
        setCheckedItems(prev => ({ ...prev, [itemName]: isChecked }));
    };

    const handleSubmit = () => {
        // For now, we'll just log the state. We will implement saving in the next step.
        console.log('Checklist submission:', {
            bookingId,
            aircraftId: aircraft?.id,
            checkedItems,
        });
        toast({
            title: "Checklist Submitted (Simulation)",
            description: "The checklist data has been captured and is ready to be saved.",
        });
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
                    {checklistType === 'pre-flight' && (
                        <>
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
                        </>
                    )}
                     {checklistType === 'post-flight' && (
                         <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">Post-flight checklist items will be displayed here.</p>
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
