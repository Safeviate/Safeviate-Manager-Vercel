'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

interface AircraftTableProps {
  data: Aircraft[];
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

function getWarningStyle(hoursRemaining: number | undefined, warnings: HourWarning[] | undefined): React.CSSProperties | undefined {
    if (hoursRemaining === undefined || !warnings || warnings.length === 0) {
        return undefined;
    }

    // Sort from lowest hours to highest to find the correct warning bucket.
    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);

    for (const warning of sortedWarnings) {
        // If remaining hours are less than or equal to the threshold, we've found our match.
        if (hoursRemaining <= warning.hours) {
            return { backgroundColor: warning.color, color: warning.foregroundColor };
        }
    }
    
    // If no threshold is met, return no style.
    return undefined;
}


export function AircraftTable({ data, inspectionSettings }: AircraftTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
        No aircraft found. Add one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => {
          const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
          const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;

          const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
          const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) || 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
              <TableCell>
                {tachoTill50 !== undefined ? (
                  <Badge style={fiftyHourStyle}>{tachoTill50.toFixed(1)} hrs</Badge>
                ) : 'N/A'}
              </TableCell>
              <TableCell>
                {tachoTill100 !== undefined ? (
                  <Badge style={hundredHourStyle}>{tachoTill100.toFixed(1)} hrs</Badge>
                ) : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions aircraft={aircraft} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
