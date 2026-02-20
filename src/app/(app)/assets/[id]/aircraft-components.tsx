
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

export function AircraftComponents({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);

  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Components</CardTitle>
          <CardDescription>A list of all tracked components installed on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Date</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>
                      {component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                    <TableCell>{component.tso ?? 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No components added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
