
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { cn } from '@/lib/utils';


const DetailItem = ({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) => (
  <div className="flex justify-between items-baseline">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium text-foreground">{children || value || 'N/A'}</dd>
  </div>
);

interface ViewAircraftDetailsProps {
    aircraft: Aircraft;
    inspectionSettings: AircraftInspectionWarningSettings | null;
}

export function ViewAircraftDetails({ aircraft, inspectionSettings }: ViewAircraftDetailsProps) {

    const hoursTo50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : null;
    const hoursTo100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : null;

    const getWarningProps = (remainingHours: number | null, warnings: HourWarning[] | undefined) => {
        if (remainingHours === null || remainingHours < 0 || !warnings) {
            return null;
        }

        // Sort warnings by hours descending to find the first match
        const sortedWarnings = [...warnings].sort((a, b) => b.hours - a.hours);

        for (const warning of sortedWarnings) {
            if (remainingHours <= warning.hours) {
                return {
                    backgroundColor: warning.color,
                    color: warning.foregroundColor,
                };
            }
        }
        return null;
    };

    const fiftyHourWarningStyle = getWarningProps(hoursTo50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourWarningStyle = getWarningProps(hoursTo100, inspectionSettings?.oneHundredHourWarnings);


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{aircraft.make} {aircraft.model}</CardTitle>
                        <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    <DetailItem label="Make" value={aircraft.make} />
                    <DetailItem label="Model" value={aircraft.model} />
                    <DetailItem label="Tail Number" value={aircraft.tailNumber} />
                    <DetailItem label="Type" value={aircraft.type} />
                    <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                </dl>
                
                <Separator />

                <div>
                    <h3 className="text-lg font-medium mb-4">Hour Tracking</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        <DetailItem label="Frame Hours" value={aircraft.frameHours?.toString()} />
                        <DetailItem label="Engine Hours" value={aircraft.engineHours?.toString()} />
                        <DetailItem label="Initial Hobbs" value={aircraft.initialHobbs?.toString()} />
                        <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toString()} />
                        <DetailItem label="Initial Tacho" value={aircraft.initialTacho?.toString()} />
                        <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toString()} />
                    </dl>
                </div>
                
                <Separator />
                
                <div>
                    <h3 className="text-lg font-medium mb-4">Inspection Tracking</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        <DetailItem label="Next 50hr Inspection (Tacho)">
                            <div className="flex items-center gap-2">
                                <span>{aircraft.tachoAtNext50Inspection || 'N/A'}</span>
                                {hoursTo50 !== null && fiftyHourWarningStyle && (
                                <Badge style={fiftyHourWarningStyle} className="border-transparent">
                                    {hoursTo50.toFixed(1)} hrs left
                                </Badge>
                                )}
                            </div>
                        </DetailItem>
                        <DetailItem label="Next 100hr Inspection (Tacho)">
                            <div className="flex items-center gap-2">
                                <span>{aircraft.tachoAtNext100Inspection || 'N/A'}</span>
                                {hoursTo100 !== null && hundredHourWarningStyle && (
                                <Badge style={hundredHourWarningStyle} className="border-transparent">
                                    {hoursTo100.toFixed(1)} hrs left
                                </Badge>
                                )}
                            </div>
                        </DetailItem>
                    </dl>
                </div>
            </CardContent>
        </Card>
    );
}

