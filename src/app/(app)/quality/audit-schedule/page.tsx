
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AuditSchedulePage() {
  return (
    <Card className="col-span-3">
        <CardHeader>
            <CardTitle>Annual Audit Schedule</CardTitle>
            <CardDescription>Status of internal and external audits for the year.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Annual audit schedule grid will be displayed here.</p>
        </CardContent>
    </Card>
  );
}
