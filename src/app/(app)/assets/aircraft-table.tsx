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
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import type { Aircraft } from './aircraft-type';
import { AircraftActions } from './aircraft-actions';
import { getInspectionBadgeStyle } from './utils';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';

interface AircraftTableProps {
  data: Aircraft[];
  inspectionSettings: AircraftInspectionWarningSettings | null;
  onEdit: (aircraft: Aircraft) => void;
  onDelete: (aircraft: Aircraft) => void;
}

export function AircraftTable({ data, inspectionSettings, onEdit, onDelete }: AircraftTableProps) {
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
          <TableHead>Hobbs</TableHead>
          <TableHead>Tacho</TableHead>
          <TableHead>Next 100hr</TableHead>
          <TableHead>Next 50hr</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => {
           const hoursTo50 = aircraft.tachoAtNext50Inspection !== undefined && aircraft.currentTacho !== undefined
             ? aircraft.tachoAtNext50Inspection - aircraft.currentTacho
             : Infinity;

           const hoursTo100 = aircraft.tachoAtNext100Inspection !== undefined && aircraft.currentTacho !== undefined
             ? aircraft.tachoAtNext100Inspection - aircraft.currentTacho
             : Infinity;
           
           const fiftyHourStyle = getInspectionBadgeStyle(hoursTo50, inspectionSettings?.fiftyHourWarnings || []);
           const hundredHourStyle = getInspectionBadgeStyle(hoursTo100, inspectionSettings?.oneHundredHourWarnings || []);

          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>
                <Badge style={hundredHourStyle}>
                  {isFinite(hoursTo100) ? `${hoursTo100.toFixed(1)} hrs` : 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge style={fiftyHourStyle}>
                  {isFinite(hoursTo50) ? `${hoursTo50.toFixed(1)} hrs` : 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions 
                  aircraft={aircraft}
                  onEdit={() => onEdit(aircraft)}
                  onDelete={() => onDelete(aircraft)}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}
