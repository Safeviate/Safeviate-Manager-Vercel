'use client';

import { useState } from 'react';
import type { Aircraft } from '../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AircraftDetailsForm } from './aircraft-details-form';
import { Pencil } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

// This is the content that used to be in the "Details" tab.

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base">{value || 'N/A'}</p>
        </div>
    );
}

function ViewAircraftDetails({ aircraft }: { aircraft: Aircraft }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{aircraft.tailNumber}</CardTitle>
        <CardDescription>{aircraft.model} - {aircraft.type}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
        <DetailItem label="Frame Hours" value={aircraft.frameHours} />
        <DetailItem label="Engine Hours" value={aircraft.engineHours} />
        <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
        <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
        <DetailItem label="Next 50hr Insp." value={aircraft.tachoAtNext50Inspection} />
        <DetailItem label="Next 100hr Insp." value={aircraft.tachoAtNext100Inspection} />
      </CardContent>
    </Card>
  );
}

interface AircraftDashboardProps {
    aircraft: Aircraft;
    tenantId: string;
}

export function AircraftDashboard({ aircraft, tenantId }: AircraftDashboardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('assets-edit');

    return (
        <div className="space-y-6 pt-6">
             {canEdit && (
                <div className="flex justify-end">
                    <Button onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {isEditing ? 'Cancel' : 'Edit Details'}
                    </Button>
                </div>
            )}
            {isEditing ? (
                <AircraftDetailsForm 
                    aircraft={aircraft}
                    tenantId={tenantId}
                    onFormSubmit={() => setIsEditing(false)} 
                />
            ) : (
                <ViewAircraftDetails aircraft={aircraft} />
            )}
        </div>
    );
}
