
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label as RechartsLabel,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';


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

// --- Helper function to check if a point is inside a polygon ---
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  if (!polygon || polygon.length === 0) return false;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}


export function ViewBookingDetails({ booking, aircraft, pilot, instructor, checklists }: ViewBookingDetailsProps) {
  
  const abbreviation = getBookingTypeAbbreviation(booking.type);

  const preFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'pre-flight'), [checklists]);
  const postFlightChecklist = useMemo(() => checklists.find(c => c.checklistType === 'post-flight'), [checklists]);

  // --- Chart State ---
  const [weight, setWeight] = useState(aircraft.emptyWeight || 0);
  const [cg, setCg] = useState(aircraft.emptyWeight && aircraft.emptyWeightMoment ? (aircraft.emptyWeightMoment / aircraft.emptyWeight) : 0);

  const cgEnvelopePoints = useMemo(() => aircraft.cgEnvelope?.map(([weight, cg]) => ({ weight, cg })) || [], [aircraft.cgEnvelope]);
  const polygonForCheck = useMemo(() => cgEnvelopePoints.map(p => ({ x: p.cg, y: p.weight })), [cgEnvelopePoints]);

  const targetPoint = { x: cg, y: weight };
  const isWithinLimits = isPointInPolygon(targetPoint, polygonForCheck);


  return (
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
            
            <Separator />

            <div>
                <h3 className="text-lg font-semibold mb-4">Checklist Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <ChecklistDetails title="Pre-Flight" checklist={preFlightChecklist} aircraftType={aircraft.type} />
                    <ChecklistDetails title="Post-Flight" checklist={postFlightChecklist} aircraftType={aircraft.type} />
                </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="text-lg font-semibold mb-4">Planning</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2">
                        {cgEnvelopePoints.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="cg" name="CG" unit=" in" domain={['dataMin - 1', 'dataMax + 1']} tickCount={5}>
                                    <RechartsLabel value="CG (in)" offset={-20} position="insideBottom" />
                                </XAxis>
                                <YAxis type="number" dataKey="weight" name="Weight" unit=" lbs" domain={['dataMin - 100', 'dataMax + 100']} tickCount={5}>
                                    <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Area type="linear" dataKey="weight" data={cgEnvelopePoints} name="CG Limit" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeWidth={2} />
                                <Scatter name="Current CG" data={[{ weight: targetPoint.y, cg: targetPoint.x }]} fill={isWithinLimits ? "#22c55e" : "#ef4444"} shape="star" size={150} />
                            </ScatterChart>
                        </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground bg-muted/50 rounded-lg p-4">
                                No CG Envelope data configured for this aircraft.
                            </div>
                        )}
                    </div>
                     <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="weight-input">Aircraft Weight (lbs)</Label>
                            <Input
                                id="weight-input"
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="cg-input">Center of Gravity (in)</Label>
                            <Input
                                id="cg-input"
                                type="number"
                                value={cg}
                                onChange={(e) => setCg(Number(e.target.value))}
                            />
                        </div>
                        <div className="pt-4 text-center">
                            <Badge className={cn(isWithinLimits ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-lg text-white px-6 py-2')}>
                                {isWithinLimits ? 'Within Limits' : 'Out of Limits'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
