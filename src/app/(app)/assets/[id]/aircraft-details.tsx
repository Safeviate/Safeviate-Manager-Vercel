
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';

const DetailItem = ({ label, value }: { label: string, value: string | number | undefined | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value || 'N/A'}</p>
    </div>
);

export function AircraftDetails({ aircraft, isEditing, tenantId, onSave }: { aircraft: Aircraft; isEditing: boolean; tenantId: string; onSave: () => void; }) {
    if (isEditing) {
        // For now, return a placeholder for the edit form
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Edit {aircraft.tailNumber}</CardTitle>
                    <CardDescription>Editing form would be here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Editing mode is not fully implemented in this step.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{aircraft.tailNumber}</CardTitle>
                <CardDescription>{aircraft.model}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <DetailItem label="Type" value={aircraft.type} />
                <DetailItem label="Current Hobbs" value={`${aircraft.currentHobbs || 0} hrs`} />
                <DetailItem label="Current Tacho" value={`${aircraft.currentTacho || 0} hrs`} />
                <DetailItem label="Empty Weight" value={`${aircraft.emptyWeight || 0} lbs`} />
                <DetailItem label="Max Takeoff Weight" value={`${aircraft.maxTakeoffWeight || 0} lbs`} />
            </CardContent>
        </Card>
    );
}
