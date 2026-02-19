
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Aircraft } from './page';
import { AssetActions } from './asset-actions';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface AssetsTableProps {
  data: Aircraft[];
  tenantId: string;
}

export function AssetsTable({ data, tenantId }: AssetsTableProps) {
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleViewClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setIsViewOpen(true);
  };

  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No aircraft found. Add one to get started.
        </div>
    );
  }
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tail Number</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>View</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((aircraft) => (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.type}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => handleViewClick(aircraft)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <AssetActions />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aircraft Details: {selectedAircraft?.tailNumber}</DialogTitle>
            <DialogDescription>
              Viewing details for {selectedAircraft?.model}.
            </DialogDescription>
          </DialogHeader>
          {selectedAircraft && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tail Number</p>
                  <p>{selectedAircraft.tailNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Model</p>
                  <p>{selectedAircraft.model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p>{selectedAircraft.type}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
