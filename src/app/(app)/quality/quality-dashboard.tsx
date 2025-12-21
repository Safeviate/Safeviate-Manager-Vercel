
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function QualityDashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Annual Audit Schedule</CardTitle>
                <CardDescription>Status of internal and external audits for the year.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Annual audit schedule grid will be displayed here.</p>
            </CardContent>
        </Card>
        <Card className="col-span-3 lg:col-span-2">
            <CardHeader>
                <CardTitle>Compliance Score Over Time</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">Compliance score line chart will be displayed here.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Non-Conformance Categories</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">Non-conformance bar chart will be displayed here.</p>
            </CardContent>
        </Card>
    </div>
  );
}
