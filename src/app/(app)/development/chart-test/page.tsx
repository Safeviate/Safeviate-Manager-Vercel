
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ChartTestPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Chart Test</CardTitle>
          <CardDescription>
            This page is ready for the new chart implementation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Awaiting new chart code.</p>
        </CardContent>
      </Card>
    </div>
  );
}
