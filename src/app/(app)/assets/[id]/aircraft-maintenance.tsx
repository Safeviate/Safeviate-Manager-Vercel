'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AircraftMaintenance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance & Tech Log</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Maintenance logs and technical history will be displayed here.</p>
      </CardContent>
    </Card>
  );
}
