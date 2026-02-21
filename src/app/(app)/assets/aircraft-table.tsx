
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
import type { Aircraft } from './page';
import { AircraftActions } from './aircraft-actions';
import { getInspectionStatusStyle } from './utils';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { cn } from '@/lib/utils';

interface AircraftTableProps {
  aircrafts: Aircraft[];
  inspectionSettings?: AircraftInspectionWarningSettings;
  tenantId: string;
  onEdit: (aircraft: Aircraft) => void;
  onRowClick: (aircraft: Aircraft) => void;
}

export function AircraftTable({ aircrafts, inspectionSettings, tenantId, onEdit, onRowClick }: AircraftTableProps) {
  if (!aircrafts || aircrafts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
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
          <TableHead>Tacho</TableHead>
          <TableHead>Next 50hr</TableHead>
          <TableHead>Next 100hr</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircrafts.map((aircraft) => {
            const fiftyHrStyle = getInspectionStatusStyle(
                aircraft.currentTacho,
                aircraft.tachoAtNext50Inspection,
                inspectionSettings?.fiftyHourWarnings
            );
            const hundredHrStyle = getInspectionStatusStyle(
                aircraft.currentTacho,
                aircraft.tachoAtNext100Inspection,
                inspectionSettings?.oneHundredHourWarnings
            );
            return (
              <TableRow key={aircraft.id} onClick={() => onRowClick(aircraft)} className="cursor-pointer">
                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                <TableCell>{aircraft.model}</TableCell>
                <TableCell>{aircraft.currentHobbs?.toFixed(1)}</TableCell>
                <TableCell>{aircraft.currentTacho?.toFixed(1)}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    style={fiftyHrStyle || {}}
                    className={cn(fiftyHrStyle && 'border-transparent')}
                  >
                    {aircraft.tachoAtNext50Inspection?.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                   <Badge 
                    variant="outline" 
                    style={hundredHrStyle || {}}
                    className={cn(hundredHrStyle && 'border-transparent')}
                  >
                    {aircraft.tachoAtNext100Inspection?.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AircraftActions tenantId={tenantId} aircraft={aircraft} onEdit={() => onEdit(aircraft)} />
                </TableCell>
              </TableRow>
            )
        })}
      </TableBody>
    </Table>
  );
}
