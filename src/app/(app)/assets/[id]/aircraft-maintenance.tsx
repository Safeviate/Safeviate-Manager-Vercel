
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';

export function AircraftMaintenance({ aircraft }: { aircraft: Aircraft }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Maintenance logs will be displayed here.</p>
      </CardContent>
    </Card>
  );
}
