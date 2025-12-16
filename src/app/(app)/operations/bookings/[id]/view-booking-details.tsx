
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Booking, MassAndBalance } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookingMassBalance } from './booking-mass-balance';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface ViewBookingDetailsProps {
  booking: Booking;
  aircraft: Aircraft;
  pilot: PilotProfile | null;
  instructor: PilotProfile | null;
  checklists: ChecklistResponse[];
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? children : <p className="text-base font-semibold">{value?.toString() || 'N/A'}</p>}
    </div>
);

const getBookingTypeAbbreviation = (type: Booking['type']): string => {
    switch (type) {
        case 'Student Training': return 'T';
        case 'Hire and Fly': return 'H';
        case 'Maintenance Flight': return 'M';
        default: return '';
    }
}

const ChecklistDetails = ({ title, checklist, aircraftType }: { title: string, checklist: ChecklistResponse | undefined, aircraftType?: string }) => {
    if (!checklist) {
        return (
            <div>
                <h4 className="font-medium text-base mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground">Not submitted.</p>
            </div>
        )
    }

    const findItemValue = (itemId: string, field: 'tacho' | 'hobbs' | 'notes') => {
        return checklist.responses.find(r => r.itemId === itemId)?.[field]
    }

    let oilUpliftDisplay = 'N/A';
    const singleEngineOilUplift = findItemValue(`${checklist.checklistType}-oil-uplift`, 'notes');
    
    if (aircraftType === 'Multi-Engine') {
        const left = findItemValue(`${checklist.checklistType}-left-oil-uplift`, 'notes');
        const right = findItemValue(`${checklist.checklistType}-right-oil-uplift`, 'notes');
        if (left || right) {
            oilUpliftDisplay = `L: ${left || '0'} / R: ${right || '0'}`;
        }
    } else if (singleEngineOilUplift) {
        oilUpliftDisplay = singleEngineOilUplift.toString();
    }


    return (
        <div>
            <h4 className="font-medium text-base mb-2">{title}</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Tacho" value={findItemValue(`${checklist.checklistType}-tacho`, 'tacho')?.toFixed(2)} />
                <DetailItem label="Hobbs" value={findItemValue(`${checklist.checklistType}-hobbs`, 'hobbs')?.toFixed(2)} />
                <DetailItem label="Fuel Uplift" value={findItemValue(`${checklist.checklistType}-fuel-uplift`, 'notes') || 'N/A'} />
                <DetailItem label="Oil Uplift" value={oilUpliftDisplay} />
            </div>
        </div>
    )
}

export function ViewBookingDetails({ booking, aircraft, pilot, instructor, checklists }: ViewBookingDetailsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [massBalanceData, setMassBalanceData] = useState<Omit<MassAndBalance, 'calculationTime'> | null>(null);

  const abbreviation = getBookingTypeAbbreviation(booking.type);

  const preFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'pre-flight'), [checklists]);
  const postFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'post-flight'), [checklists]);

  const handleSaveMassAndBalance = () => {
    if (!firestore || !booking || !massBalanceData) return;

    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
    const dataToSave: MassAndBalance = {
      ...massBalanceData,
      calculationTime: Timestamp.now(),
    }
    updateDocumentNonBlocking(bookingRef, { massAndBalance: dataToSave });

    toast({
        title: "Mass & Balance Saved",
        description: "The calculation has been saved to this booking.",
    });
  };

  return (
    <div className='space-y-6'>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Booking #{abbreviation}{booking.bookingNumber}</CardTitle>
                        <CardDescription>Details for the booking on {aircraft.tailNumber}.</CardDescription>
                    </div>
                    <Badge variant={booking.status.startsWith('Cancel') ? 'destructive' : 'secondary'}>{booking.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Aircraft" value={aircraft.tailNumber} />
                    <DetailItem label="Booking Type" value={booking.type} />
                    <DetailItem label="Pilot / Student" value={pilot ? `${pilot.firstName} ${pilot.lastName}` : 'N/A'} />
                    <DetailItem label="Start Time" value={format(booking.startTime.toDate(), 'PPP HH:mm')} />
                    <DetailItem label="End Time" value={format(booking.endTime.toDate(), 'PPP HH:mm')} />
                    {booking.type === 'Student Training' && (
                        <DetailItem label="Instructor" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : 'N/A'} />
                    )}
                </div>

                {booking.status === 'Cancelled with Reason' && booking.cancellationReason && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Cancellation Reason</p>
                            <p className="text-base font-semibold text-destructive">{booking.cancellationReason}</p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Checklist Information</CardTitle>
                <CardDescription>Review pre-flight and post-flight data.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <ChecklistDetails title="Pre-Flight" checklist={preFlightChecklist} aircraftType={aircraft.type} />
                    <ChecklistDetails title="Post-Flight" checklist={postFlightChecklist} aircraftType={aircraft.type} />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Mass &amp; Balance</CardTitle>
                <CardDescription>Calculate and save the mass and balance for this specific flight.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <BookingMassBalance
                    aircraft={aircraft}
                    booking={booking}
                    onCalculationChange={setMassBalanceData}
                    initialData={booking.massAndBalance}
                />
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSaveMassAndBalance} disabled={!massBalanceData}>
                        <Save className='mr-2 h-4 w-4' />
                        Save Mass & Balance to Booking
                    </Button>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
