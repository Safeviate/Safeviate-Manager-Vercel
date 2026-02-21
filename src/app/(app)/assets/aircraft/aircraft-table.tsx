
'use client';

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
  rolesMap: Map<string, string>;
  departmentsMap: Map<string, string>;
  tenantId: string;
  inspectionWarningSettings: AircraftInspectionWarningSettings | null;
}

const getInspectionColor = (currentTacho: number, nextTacho: number, warnings: HourWarning[]): string | undefined => {
    if (!currentTacho || !nextTacho || !warnings) return undefined;
    const hoursRemaining = nextTacho - currentTacho;
    if (hoursRemaining < 0) return '#ef4444'; // default red for overdue

    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);
    
    for (const warning of sortedWarnings) {
        if (hoursRemaining <= warning.hours) {
            return warning.color;
        }
    }
    return undefined;
};


export function AircraftTable({ data, rolesMap, departmentsMap, tenantId, inspectionWarningSettings }: AircraftTableProps) {
  if (data.length === 0) {
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
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => {
          const fiftyHourColor = getInspectionColor(aircraft.currentTacho || 0, aircraft.tachoAtNext50Inspection || 0, inspectionWarningSettings?.fiftyHourWarnings || []);
          const hundredHourColor = getInspectionColor(aircraft.currentTacho || 0, aircraft.tachoAtNext100Inspection || 0, inspectionWarningSettings?.oneHundredHourWarnings || []);

          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1)}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1)}</TableCell>
              <TableCell style={{ color: fiftyHourColor }}>{aircraft.tachoAtNext50Inspection?.toFixed(1)}</TableCell>
              <TableCell style={{ color: hundredHourColor }}>{aircraft.tachoAtNext100Inspection?.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                <AircraftActions tenantId={tenantId} aircraft={aircraft} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}
