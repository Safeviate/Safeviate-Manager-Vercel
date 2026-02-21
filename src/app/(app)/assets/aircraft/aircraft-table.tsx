'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';
import { Badge } from '@/components/ui/badge';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { cn } from '@/lib/utils';


interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
  inspectionSettings?: AircraftInspectionWarningSettings | null;
}

const getWarningClass = (
    remainingHours: number,
    warnings: { hours: number; color: string; foregroundColor?: string }[]
  ) => {
    if (!warnings || warnings.length === 0) return {};
  
    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);
    
    for (const warning of sortedWarnings) {
      if (remainingHours <= warning.hours) {
        return {
          color: warning.foregroundColor || 'hsl(var(--foreground))',
          backgroundColor: warning.color,
        };
      }
    }
  
    return {};
  };


export function AircraftTable({ data, tenantId, inspectionSettings }: AircraftTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => {

            const hoursTo50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : Infinity;
            const hoursTo100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : Infinity;

            const fiftyHourStyle = getWarningClass(hoursTo50, inspectionSettings?.fiftyHourWarnings || []);
            const hundredHourStyle = getWarningClass(hoursTo100, inspectionSettings?.oneHundredHourWarnings || []);

            return (
              <TableRow key={aircraft.id}>
                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                <TableCell>{aircraft.model}</TableCell>
                <TableCell>{aircraft.currentHobbs?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>
                    <Badge style={fiftyHourStyle} variant={Object.keys(fiftyHourStyle).length > 0 ? 'default' : 'outline'}>
                        {aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}
                    </Badge>
                </TableCell>
                <TableCell>
                    <Badge style={hundredHourStyle} variant={Object.keys(hundredHourStyle).length > 0 ? 'default' : 'outline'}>
                        {aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AircraftActions aircraft={aircraft} />
                </TableCell>
              </TableRow>
            )
        })}
      </TableBody>
    </Table>
  );
}
